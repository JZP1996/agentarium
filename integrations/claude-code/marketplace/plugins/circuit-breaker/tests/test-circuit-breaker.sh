#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POST_HOOK="$SCRIPT_DIR/../hooks/track-failure.sh"
PRE_HOOK="$SCRIPT_DIR/../hooks/check-breaker.sh"
TEST_TMPDIR=$(mktemp -d)
trap 'rm -rf "$TEST_TMPDIR"' EXIT

failure() {
  printf '{"session_id":"%s","tool_name":"Bash","tool_input":{"command":"fail"},"error":"fatal: failed"}' "$1"
}

pre() {
  printf '{"session_id":"%s","tool_name":"Bash","tool_input":{"command":"fail"}}' "$1"
}

for _ in 1 2; do
  printf '%s' "$(failure a)" | TMPDIR="$TEST_TMPDIR" bash "$POST_HOOK" >/dev/null
done
[[ "$(printf '%s' "$(pre a)" | TMPDIR="$TEST_TMPDIR" bash "$PRE_HOOK")" == '{}' ]]

third=$(printf '%s' "$(failure a)" | TMPDIR="$TEST_TMPDIR" bash "$POST_HOOK")
[[ "$third" == *'Circuit breaker tripped'* ]]
blocked=$(printf '%s' "$(pre a)" | TMPDIR="$TEST_TMPDIR" bash "$PRE_HOOK")
[[ "$blocked" == *'"permissionDecision":"deny"'* ]]
[[ "$(printf '%s' "$(pre b)" | TMPDIR="$TEST_TMPDIR" bash "$PRE_HOOK")" == '{}' ]]

success='{"session_id":"a","tool_name":"Bash","tool_input":{"command":"fail"},"tool_result":"ok"}'
printf '%s' "$success" | TMPDIR="$TEST_TMPDIR" bash "$POST_HOOK" >/dev/null
[[ "$(printf '%s' "$(pre a)" | TMPDIR="$TEST_TMPDIR" bash "$PRE_HOOK")" == '{}' ]]

transient='{"session_id":"c","tool_name":"Bash","tool_input":{"command":"curl"},"error":"HTTP 429 rate limit"}'
for _ in 1 2 3; do
  [[ "$(printf '%s' "$transient" | TMPDIR="$TEST_TMPDIR" bash "$POST_HOOK")" == '{}' ]]
done
[[ "$(printf '%s' '{"session_id":"c","tool_name":"Bash","tool_input":{"command":"curl"}}' | TMPDIR="$TEST_TMPDIR" bash "$PRE_HOOK")" == '{}' ]]

printf '%s\n' 'Circuit breaker tests passed.'
