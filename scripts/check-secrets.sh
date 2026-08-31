#!/usr/bin/env sh

set -eu

if ! command -v gitleaks >/dev/null 2>&1; then
  printf '%s\n' 'error: gitleaks is required; install it from https://github.com/gitleaks/gitleaks' >&2
  exit 1
fi

gitleaks detect --source . --redact --no-banner
