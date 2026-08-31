#!/usr/bin/env bash
# Install this marketplace and all plugins into Claude Code.

set -euo pipefail

MARKETPLACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MARKETPLACE_NAME="personal-agent-tools"
MANIFEST="$MARKETPLACE_DIR/.claude-plugin/marketplace.json"
DISABLED_MANIFEST="$MARKETPLACE_DIR/disabled-plugins.json"
MANAGED_MANIFEST="$HOME/.claude/.agentarium-managed-marketplace-plugins"

if [[ "${1:-}" == --uninstall ]]; then
  if [[ -f "$MANAGED_MANIFEST" ]]; then
    while IFS= read -r name; do
      [[ -n "$name" ]] || continue
      claude plugin uninstall "$name@$MARKETPLACE_NAME" >/dev/null 2>&1 || true
    done < "$MANAGED_MANIFEST"
    rm -f "$MANAGED_MANIFEST"
  fi
  claude plugin marketplace remove "$MARKETPLACE_NAME" >/dev/null 2>&1 || true
  exit 0
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "error: 'claude' CLI not found in PATH" >&2
  exit 1
fi

if [[ ! -f "$MANIFEST" ]]; then
  echo "error: manifest not found at $MANIFEST" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "error: 'jq' is required" >&2
  exit 1
fi

marketplace_exists() {
  local name="$1"
  claude plugin marketplace list 2>/dev/null | awk -v name="$name" '$NF == name { found = 1 } END { exit !found }'
}

echo "==> Validating marketplace manifest"
claude plugin validate "$MARKETPLACE_DIR"

echo
echo "==> Registering marketplace: $MARKETPLACE_NAME"
if marketplace_exists "$MARKETPLACE_NAME"; then
  echo "    already registered, refreshing"
  if ! claude plugin marketplace update "$MARKETPLACE_NAME"; then
    echo "    registered source is unavailable, re-registering"
    claude plugin marketplace remove "$MARKETPLACE_NAME"
    claude plugin marketplace add "$MARKETPLACE_DIR"
  fi
else
  claude plugin marketplace add "$MARKETPLACE_DIR"
fi

echo
echo "==> Installing plugins"
installed_list="$(claude plugin list 2>/dev/null || true)"
plugins=()
while IFS= read -r name; do
  plugins+=("$name")
done < <(jq -r '.plugins[].name' "$MANIFEST")

if [[ -f "$MANAGED_MANIFEST" ]]; then
  while IFS= read -r previous; do
    [[ -n "$previous" ]] || continue
    if ! printf '%s\n' "${plugins[@]}" | grep -qxF "$previous"; then
      echo "  [remove]  $previous@$MARKETPLACE_NAME"
      claude plugin uninstall "$previous@$MARKETPLACE_NAME" >/dev/null 2>&1 || true
    fi
  done < "$MANAGED_MANIFEST"
else
  # Remove the plugin retired before marketplace ownership manifests existed.
  claude plugin uninstall "compaction-monitor@$MARKETPLACE_NAME" >/dev/null 2>&1 || true
fi

for name in "${plugins[@]}"; do
  ref="$name@$MARKETPLACE_NAME"
  if grep -qE "(^|[[:space:]])$name(@|[[:space:]]|$)" <<<"$installed_list"; then
    echo "  [update]  $ref"
    claude plugin update "$ref" || {
      claude plugin uninstall "$ref" >/dev/null 2>&1 || true
      claude plugin install "$ref"
    }
    continue
  fi
  echo "  [install] $ref"
  if ! claude plugin install "$ref"; then
    echo "    !! failed to install $ref" >&2
  fi
done
printf '%s\n' "${plugins[@]}" > "$MANAGED_MANIFEST"

echo
echo "==> Applying disabled plugin defaults"
if [[ ! -f "$DISABLED_MANIFEST" ]]; then
  echo "    no disabled plugin manifest found"
else
  jq empty "$DISABLED_MANIFEST"
  disabled_plugins=()
  while IFS= read -r ref; do
    disabled_plugins+=("$ref")
  done < <(jq -r '.plugins[]' "$DISABLED_MANIFEST")

  if ((${#disabled_plugins[@]})); then
    for ref in "${disabled_plugins[@]}"; do
      echo "  [disable] $ref"
      disable_output="$(claude plugin disable "$ref" 2>&1)" || {
        if grep -q "already disabled" <<<"$disable_output"; then
          echo "    already disabled"
          continue
        fi
        printf '%s\n' "$disable_output" >&2
        echo "    !! failed to disable $ref" >&2
      }
    done
  fi
fi

echo
echo "==> Done. Current plugins:"
claude plugin list
