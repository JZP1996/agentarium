#!/usr/bin/env bash

set -euo pipefail
trap 'echo "{}"; exit 0' ERR

WARN_THRESHOLD=3
BLOCK_THRESHOLD=5
STATE_DIR="${TMPDIR:-/tmp}"

if [[ "${DISABLE_RETRY_LOOP_DETECTOR:-0}" == 1 ]] || ! command -v jq >/dev/null 2>&1; then
  echo '{}'
  exit 0
fi

INPUT=$(cat)
SESSION_ID=$(jq -r '.session_id // empty' <<<"$INPUT" 2>/dev/null)
TOOL_NAME=$(jq -r '.tool_name // empty' <<<"$INPUT" 2>/dev/null)
[[ -n "$SESSION_ID" && -n "$TOOL_NAME" ]] || { echo '{}'; exit 0; }

hash() {
  if command -v shasum >/dev/null 2>&1; then shasum -a 256 | cut -d' ' -f1
  else sha256sum | cut -d' ' -f1
  fi
}

SESSION_HASH=$(printf '%s' "$SESSION_ID" | hash)
ARGS_HASH=$(jq -Sc '.tool_input // {}' <<<"$INPUT" | hash)
STATE_FILE="$STATE_DIR/claude-retry-loop-detector-$(id -u)-$SESSION_HASH.state"
FINGERPRINT="$TOOL_NAME:$ARGS_HASH"
LAST_FINGERPRINT=''
CURRENT_COUNT=0

if [[ -f "$STATE_FILE" ]]; then
  { read -r LAST_FINGERPRINT; read -r CURRENT_COUNT; } < "$STATE_FILE" || true
  [[ "$CURRENT_COUNT" =~ ^[0-9]+$ ]] || CURRENT_COUNT=0
fi

if [[ "$FINGERPRINT" == "$LAST_FINGERPRINT" ]]; then
  NEW_COUNT=$((CURRENT_COUNT + 1))
else
  NEW_COUNT=1
fi
printf '%s\n%d\n' "$FINGERPRINT" "$NEW_COUNT" > "$STATE_FILE"

if ((NEW_COUNT >= BLOCK_THRESHOLD)); then
  MESSAGE="BLOCKED: $TOOL_NAME was called $NEW_COUNT times with identical arguments. Stop and try a different approach, or set DISABLE_RETRY_LOOP_DETECTOR=1 to bypass."
  jq -n --arg reason "$MESSAGE" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
elif ((NEW_COUNT >= WARN_THRESHOLD)); then
  MESSAGE="WARNING: $TOOL_NAME was called $NEW_COUNT times with identical arguments. Try a different approach or change the arguments."
  jq -n --arg context "$MESSAGE" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:$context}}'
else
  echo '{}'
fi
