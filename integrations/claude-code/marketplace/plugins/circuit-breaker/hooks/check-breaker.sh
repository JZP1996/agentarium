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
[[ -n "$SESSION_ID" && -n "$TOOL_NAME" ]] || { echo '{}'; exit 0; }
[[ "$TOOL_INPUT" != *'circuit-breaker: override'* ]] || { echo '{}'; exit 0; }

hash() {
  if command -v shasum >/dev/null 2>&1; then shasum -a 256 | cut -d' ' -f1
  else sha256sum | cut -d' ' -f1
  fi
}

SESSION_HASH=$(printf '%s' "$SESSION_ID" | hash)
FINGERPRINT=$(printf '%s:%s' "$TOOL_NAME" "$TOOL_INPUT" | hash)
STATE_FILE="$STATE_DIR/claude-circuit-breaker-$(id -u)-$SESSION_HASH.json"
STATE=$(cat "$STATE_FILE" 2>/dev/null || printf '{}')
COUNT=$(jq -r --arg fp "$FINGERPRINT" '.[$fp].count // 0' <<<"$STATE")
ERROR=$(jq -r --arg fp "$FINGERPRINT" '.[$fp].error // "unknown"' <<<"$STATE")

if ((COUNT >= TRIP_THRESHOLD)); then
  MESSAGE="CIRCUIT BREAKER TRIPPED: this tool call failed $COUNT consecutive times. Try a different approach. Last error: $ERROR. Add 'circuit-breaker: override' to bypass intentionally."
  jq -n --arg reason "$MESSAGE" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
else
  echo '{}'
fi
