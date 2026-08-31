#!/usr/bin/env bash

set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${AGENTARIUM_HOME:-$HOME/.agents}"
ASSET_INSTALLER="$SOURCE_DIR/scripts/install-assets.js"
selection=""
selection_provided=false
force=false

usage() {
  printf 'usage: %s [--integrations 1,2,3] [--force]\n' "$0"
}

while (($#)); do
  case "$1" in
    --integrations)
      (($# >= 2)) || { usage >&2; exit 2; }
      selection="$2"
      selection_provided=true
      shift 2
      ;;
    --help)
      usage
      exit 0
      ;;
    --force)
      force=true
      shift
      ;;
    *)
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "$selection_provided" == false ]]; then
  printf '\n%s\n' 'Configure agent integrations (comma-separated, Enter to skip):'
  printf '%s\n' \
    '  1) OpenCode' \
    '  2) Claude Code' \
    '  3) Codex'
  read -r -p 'Selection: ' selection
fi

selection="${selection//[[:space:]]/}"
if [[ ! "$selection" =~ ^([123](,[123])*)?$ ]]; then
  printf 'error: invalid integration selection: %s\n' "$selection" >&2
  exit 2
fi

choices=()
if [[ -n "$selection" ]]; then
  IFS=',' read -r -a requested <<< "$selection"
  for choice in "${requested[@]}"; do
    case ",${choices_csv:-}," in
      *",$choice,"*) ;;
      *)
        choices+=("$choice")
        choices_csv="${choices_csv:+$choices_csv,}$choice"
        ;;
    esac
  done
  if ! command -v node >/dev/null 2>&1; then
    printf '%s\n' 'error: Node.js is required for the selected integrations' >&2
    exit 3
  fi
fi

preflight() {
  local failed=0
  for choice in "${choices[@]+"${choices[@]}"}"; do
    case "$choice" in
      1)
        config_dir="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
        node "$ASSET_INSTALLER" check-block "$config_dir/AGENTS.md" || failed=1
        node "$ASSET_INSTALLER" check-plugins "$SOURCE_DIR/integrations/opencode/plugins" \
          "$config_dir/plugins" "$config_dir/.agentarium-managed-plugins" "$force" || failed=1
        ;;
      2)
        node "$ASSET_INSTALLER" check-block "$HOME/.claude/rules/agentarium.md" || failed=1
        node "$ASSET_INSTALLER" check-skills "$SOURCE_DIR/skills" "$HOME/.claude/skills" \
          "$HOME/.claude/skills/.agentarium-managed-skills" "$force" || failed=1
        ;;
      3)
        node "$ASSET_INSTALLER" check-block "${CODEX_HOME:-$HOME/.codex}/AGENTS.md" || failed=1
        codex_args=(--check)
        [[ "$force" == true ]] && codex_args+=(--force)
        node "$SOURCE_DIR/integrations/codex/install-hooks.js" \
          "${CODEX_HOME:-$HOME/.codex}" "$SOURCE_DIR/integrations/codex/hooks/hooks.json" \
          "${codex_args[@]}" || failed=1
        ;;
    esac
  done
  return "$failed"
}

if ! conflict=$(preflight 2>&1); then
  printf '%s\n' "$conflict" >&2
  if [[ "$selection_provided" == true ]]; then
    printf '%s\n' 'error: use --force to overwrite unmanaged conflicts' >&2
    exit 1
  fi
  read -r -p 'Overwrite these unmanaged conflicts? [y/N] ' answer
  [[ "$answer" =~ ^([yY]|[yY][eE][sS])$ ]] || exit 1
  force=true
  preflight
fi

sync_directory() {
  local source="$1"
  local destination="$2"

  if [[ -L "$destination" ]]; then
    rm "$destination"
  elif [[ -e "$destination" && ! -d "$destination" ]]; then
    printf 'error: installation target is not a directory: %s\n' "$destination" >&2
    exit 1
  fi

  mkdir -p "$destination"
  find "$destination" -mindepth 1 -maxdepth 1 -exec rm -r {} +
  cp -R "$source"/. "$destination"/
}

install_core() {
  mkdir -p "$INSTALL_DIR"
  [[ -e "$INSTALL_DIR/opencode" || -L "$INSTALL_DIR/opencode" ]] && rm -r "$INSTALL_DIR/opencode"
  [[ -e "$INSTALL_DIR/claude-code" || -L "$INSTALL_DIR/claude-code" ]] && rm -r "$INSTALL_DIR/claude-code"
  sync_directory "$SOURCE_DIR/skills" "$INSTALL_DIR/skills"
  sync_directory "$SOURCE_DIR/instructions" "$INSTALL_DIR/instructions"

  {
    printf '# Agent Guidelines\n\n'
    cat "$INSTALL_DIR/instructions/base.md"
    printf '\n'
    cat "$INSTALL_DIR/instructions/engineering.md"
  } > "$INSTALL_DIR/AGENTS.md"
}

install_opencode() {
  local config_dir="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
  local plugin_dir="$config_dir/plugins"
  local manifest="$config_dir/.agentarium-managed-plugins"

  node "$ASSET_INSTALLER" block "$config_dir/AGENTS.md" "$INSTALL_DIR/AGENTS.md"
  node "$ASSET_INSTALLER" plugins \
    "$SOURCE_DIR/integrations/opencode/plugins" "$plugin_dir" "$manifest" "$force"
  printf 'Installed Agentarium OpenCode integration: managed instructions, plugins, and %s\n' "$manifest"
}

install_claude() {
  local config_dir="$HOME/.claude"
  local runtime_dir="$config_dir/agentarium"
  local rules_dir="$config_dir/rules"
  local skills_dir="$config_dir/skills"

  sync_directory "$SOURCE_DIR/integrations/claude-code" "$runtime_dir"
  mkdir -p "$rules_dir"
  node "$ASSET_INSTALLER" block "$rules_dir/agentarium.md" "$INSTALL_DIR/AGENTS.md"
  node "$ASSET_INSTALLER" skills \
    "$INSTALL_DIR/skills" "$skills_dir" "$skills_dir/.agentarium-managed-skills" "$force"

  if command -v claude >/dev/null 2>&1 &&
    command -v bash >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
    "$runtime_dir/marketplace/install.sh"
  else
    printf '%s\n' \
      'warning: Claude marketplace plugins were not registered; claude, bash, and jq are required' >&2
  fi
  printf '%s\n' 'Installed Agentarium Claude Code integration: rules, Skills, runtime, and marketplace plugins'
}

install_codex() {
  local config_dir="${CODEX_HOME:-$HOME/.codex}"
  local runtime_dir="$config_dir/agentarium"

  mkdir -p "$config_dir"
  node "$ASSET_INSTALLER" block "$config_dir/AGENTS.md" "$INSTALL_DIR/AGENTS.md"
  sync_directory "$SOURCE_DIR/integrations/codex" "$runtime_dir"
  rm -rf "$runtime_dir/tests"
  codex_args=()
  [[ "$force" == true ]] && codex_args+=(--force)
  node "$runtime_dir/install-hooks.js" "$config_dir" "$runtime_dir/hooks/hooks.json" \
    "${codex_args[@]+"${codex_args[@]}"}"
  printf '%s\n' 'Installed Agentarium Codex integration: managed instructions, runtime hooks, and hooks.json entries'
  printf '%s\n' 'Review and trust the installed hooks with /hooks in Codex.'
}

install_core
printf 'Installed Agentarium core files to %s\n' "$INSTALL_DIR"

if ((${#choices[@]})); then
  for choice in "${choices[@]}"; do
    case "$choice" in
      1) install_opencode ;;
      2) install_claude ;;
      3) install_codex ;;
    esac
  done
fi
