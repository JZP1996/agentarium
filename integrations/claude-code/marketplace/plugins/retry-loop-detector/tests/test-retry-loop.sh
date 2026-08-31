#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK="$SCRIPT_DIR/../hooks/detect-retry-loop.sh"
TEST_TMPDIR=$(mktemp -d)
trap 'rm -rf "$TEST_TMPDIR"' EXIT

run_hook() {
  printf '%s' "$1" | TMPDIR="$TEST_TMPDIR" bash "$HOOK"
}

input() {
  printf '{"session_id":"%s","tool_name":"Bash","tool_input":{"command":"same"}}' "$1"
}

[[ "$(run_hook "$(input a)")" == '{}' ]]
[[ "$(run_hook "$(input a)")" == '{}' ]]
warning=$(run_hook "$(input a)")
[[ "$warning" == *'WARNING'* && "$warning" != *'permissionDecision'* ]]

run_hook "$(input a)" >/dev/null
blocked=$(run_hook "$(input a)")
[[ "$blocked" == *'"permissionDecision":"deny"'* ]]

[[ "$(run_hook "$(input b)")" == '{}' ]]
[[ "$(printf 'not json' | TMPDIR="$TEST_TMPDIR" bash "$HOOK")" == '{}' ]]

printf '%s\n' 'Retry loop detector tests passed.'
