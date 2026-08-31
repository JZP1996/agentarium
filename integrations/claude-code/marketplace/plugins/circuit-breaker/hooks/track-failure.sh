#!/usr/bin/env bash

set -euo pipefail
trap 'echo "{}"; exit 0' ERR

TRIP_THRESHOLD=3
STATE_DIR="${TMPDIR:-/tmp}"

command -v jq >/dev/null 2>&1 || { echo '{}'; exit 0; }
INPUT=$(cat)
SESSION_ID=$(jq -r '.session_id // empty' <<<"$INPUT")
TOOL_NAME=$(jq -r '.tool_name // empty' <<<"$INPUT")
TOOL_INPUT=$(jq -Sc '.tool_input // {}' <<<"$INPUT")
ERROR=$(jq -r 'if .error == null then empty elif .error | type == "string" then .error else (.error | tostring) end' <<<"$INPUT" | head -c 3000)
[[ -n "$SESSION_ID" && -n "$TOOL_NAME" ]] || { echo '{}'; exit 0; }

hash() {
  if command -v shasum >/dev/null 2>&1; then shasum -a 256 | cut -d' ' -f1
  else sha256sum | cut -d' ' -f1
  fi
}

SESSION_HASH=$(printf '%s' "$SESSION_ID" | hash)
FINGERPRINT=$(printf '%s:%s' "$TOOL_NAME" "$TOOL_INPUT" | hash)
STATE_FILE="$STATE_DIR/claude-circuit-breaker-$(id -u)-$SESSION_HASH.json"
STATE=$(cat "$STATE_FILE" 2>/dev/null || printf '{}')
jq empty <<<"$STATE" >/dev/null 2>&1 || STATE='{}'

if [[ -z "$ERROR" ]]; then
  TEMPORARY="$STATE_FILE.$$"
  jq --arg fp "$FINGERPRINT" 'del(.[$fp], ._last)' <<<"$STATE" > "$TEMPORARY"
  mv "$TEMPORARY" "$STATE_FILE"
  echo '{}'
  exit 0
fi

if [[ "$ERROR" =~ 429.*[Rr]ate|[Ss]tatus[[:space:]]*:?[[:space:]]*429 ]] ||
  [[ "$ERROR" =~ ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENETUNREACH|ENOTFOUND|[Rr]etry-[Aa]fter|[Gg]etaddrinfo|502|503|Bad.Gateway|Service.Unavailable ]]; then
  rm -f "$STATE_FILE"
  echo '{}'
  exit 0
fi

LAST_FINGERPRINT=$(jq -r '._last // empty' <<<"$STATE")
if [[ "$LAST_FINGERPRINT" != "$FINGERPRINT" ]]; then
  STATE='{}'
fi
COUNT=$(jq -r --arg fp "$FINGERPRINT" '.[$fp].count // 0' <<<"$STATE")
COUNT=$((COUNT + 1))
TEMPORARY="$STATE_FILE.$$"
jq --arg fp "$FINGERPRINT" --argjson count "$COUNT" --arg error "${ERROR%%$'\n'*}" \
  '.[$fp]={count:$count,error:($error[0:160])} | ._last=$fp' <<<"$STATE" > "$TEMPORARY"
mv "$TEMPORARY" "$STATE_FILE"

if ((COUNT >= TRIP_THRESHOLD)); then
  MESSAGE="Circuit breaker tripped after $COUNT consecutive failures for $TOOL_NAME."
  jq -n --arg context "$MESSAGE" \
    '{hookSpecificOutput:{hookEventName:"PostToolUseFailure",additionalContext:$context}}'
elif ((COUNT >= 2)); then
  MESSAGE="Consecutive failure #$COUNT for $TOOL_NAME; the circuit breaker trips at 3."
  jq -n --arg context "$MESSAGE" \
    '{hookSpecificOutput:{hookEventName:"PostToolUseFailure",additionalContext:$context}}'
else
  echo '{}'
fi
