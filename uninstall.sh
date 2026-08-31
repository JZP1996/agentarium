#!/usr/bin/env bash

set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${AGENTARIUM_HOME:-$HOME/.agents}"
ASSET_INSTALLER="$SOURCE_DIR/scripts/install-assets.js"

opencode_dir="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
claude_dir="$HOME/.claude"
codex_dir="${CODEX_HOME:-$HOME/.codex}"
if [[ -f "$opencode_dir/.agentarium-managed-plugins" ||
      -f "$claude_dir/skills/.agentarium-managed-skills" ||
      -d "$claude_dir/agentarium" ||
      -f "$codex_dir/.agentarium-managed-hooks.json" ||
      -d "$codex_dir/agentarium" ]] && ! command -v node >/dev/null 2>&1; then
  printf '%s\n' 'error: Node.js is required to uninstall Agentarium integrations' >&2
  exit 3
fi

if command -v node >/dev/null 2>&1; then
node "$ASSET_INSTALLER" remove-block "$opencode_dir/AGENTS.md"
node "$ASSET_INSTALLER" remove-plugins \
  "$opencode_dir/plugins" "$opencode_dir/.agentarium-managed-plugins"

if command -v claude >/dev/null 2>&1 &&
  [[ -x "$claude_dir/agentarium/marketplace/install.sh" ]]; then
  "$claude_dir/agentarium/marketplace/install.sh" --uninstall
fi
node "$ASSET_INSTALLER" remove-block "$claude_dir/rules/agentarium.md"
node "$ASSET_INSTALLER" remove-skills \
  "$claude_dir/skills" "$claude_dir/skills/.agentarium-managed-skills"
rm -rf "$claude_dir/agentarium"

node "$ASSET_INSTALLER" remove-block "$codex_dir/AGENTS.md"
node "$SOURCE_DIR/integrations/codex/install-hooks.js" \
  "$codex_dir" "$SOURCE_DIR/integrations/codex/hooks/hooks.json" --remove
rm -rf "$codex_dir/agentarium"
fi

rm -rf "$INSTALL_DIR/AGENTS.md" "$INSTALL_DIR/instructions" "$INSTALL_DIR/skills"
rmdir "$INSTALL_DIR" 2>/dev/null || true
printf '%s\n' 'Removed Agentarium-managed files and configuration blocks.'
