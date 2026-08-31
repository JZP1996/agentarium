#!/usr/bin/env bash

set -euo pipefail

failed=0

check() {
  local label="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    printf '  ✓ %s\n' "$label"
  else
    printf '  ✗ %s\n' "$label" >&2
    failed=1
  fi
}

printf '%s\n' 'Agentarium doctor'
check 'shared instructions' test -s "${AGENTARIUM_HOME:-$HOME/.agents}/AGENTS.md"
check 'shared Skills' test -d "${AGENTARIUM_HOME:-$HOME/.agents}/skills"

if command -v node >/dev/null 2>&1; then
  printf '  ✓ Node.js\n'
else
  printf '%s\n' '  ⚠ Node.js is unavailable; integrations cannot be installed or removed' >&2
fi

exit "$failed"
