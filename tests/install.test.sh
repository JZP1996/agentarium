#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_ROOT=$(mktemp -d)
trap 'rm -rf "$TEST_ROOT"' EXIT

core_home="$TEST_ROOT/core"
PATH=/usr/bin:/bin HOME="$core_home" AGENTARIUM_HOME="$core_home/.agents" \
  /bin/bash "$ROOT/install.sh" --integrations '' >/dev/null
test -s "$core_home/.agents/AGENTS.md"

invalid_home="$TEST_ROOT/invalid"
if HOME="$invalid_home" "$ROOT/install.sh" --integrations 4 >/dev/null 2>&1; then
  exit 1
fi
test ! -e "$invalid_home/.agents"

home="$TEST_ROOT/full"
mkdir -p "$home/.claude" "$home/.codex"
printf '%s\n' 'user claude instructions' > "$home/.claude/CLAUDE.md"
printf '%s\n' 'user codex instructions' > "$home/.codex/AGENTS.md"
HOME="$home" CODEX_HOME="$home/.codex" "$ROOT/install.sh" --integrations 1,2,3 >/dev/null
HOME="$home" CODEX_HOME="$home/.codex" "$ROOT/install.sh" --integrations 1,2,3 >/dev/null

grep -q '^user claude instructions$' "$home/.claude/CLAUDE.md"
grep -q '^user codex instructions$' "$home/.codex/AGENTS.md"
test "$(grep -c 'BEGIN AGENTARIUM' "$home/.codex/AGENTS.md")" -eq 1
test -f "$home/.claude/rules/agentarium.md"
test -f "$home/.claude/skills/code-review/SKILL.md"
test "$(grep -c 'BEGIN AGENTARIUM' "$home/.config/opencode/AGENTS.md")" -eq 1
test -f "$home/.config/opencode/plugins/retry-loop-detector.js"
test ! -e "$home/.config/opencode/plugins/circuit-breaker.js"
touch "$home/.agents/user-owned"

HOME="$home" AGENTARIUM_HOME="$home/.agents" "$ROOT/doctor.sh" >/dev/null
HOME="$home" CODEX_HOME="$home/.codex" "$ROOT/uninstall.sh" >/dev/null
grep -q '^user claude instructions$' "$home/.claude/CLAUDE.md"
grep -q '^user codex instructions$' "$home/.codex/AGENTS.md"
test -f "$home/.agents/user-owned"
test ! -e "$home/.claude/agentarium"
test ! -e "$home/.claude/skills/code-review"
test ! -e "$home/.config/opencode/AGENTS.md"
test ! -e "$home/.config/opencode/plugins/retry-loop-detector.js"

unsafe_home="$TEST_ROOT/unsafe"
mkdir -p "$unsafe_home/.config/opencode/plugins"
printf '%s\n' '../victim' > "$unsafe_home/.config/opencode/.agentarium-managed-plugins"
touch "$unsafe_home/.config/opencode/victim"
if HOME="$unsafe_home" "$ROOT/install.sh" --integrations 1 >/dev/null 2>&1; then
  exit 1
fi
test -f "$unsafe_home/.config/opencode/victim"
test ! -e "$unsafe_home/.agents"

conflict_home="$TEST_ROOT/conflict"
mkdir -p "$conflict_home/.config/opencode/plugins"
printf '%s\n' 'user plugin' > "$conflict_home/.config/opencode/plugins/bash-error-diagnostics.js"
if HOME="$conflict_home" "$ROOT/install.sh" --integrations 1 >/dev/null 2>&1; then
  exit 1
fi
test ! -e "$conflict_home/.agents"
grep -q '^user plugin$' "$conflict_home/.config/opencode/plugins/bash-error-diagnostics.js"

HOME="$conflict_home" "$ROOT/install.sh" --integrations 1 --force >/dev/null
test -f "$conflict_home/.config/opencode/.agentarium-managed-plugins"
test ! "$(cat "$conflict_home/.config/opencode/plugins/bash-error-diagnostics.js")" = 'user plugin'

interactive_home="$TEST_ROOT/interactive"
mkdir -p "$interactive_home/.config/opencode/plugins"
printf '%s\n' 'user plugin' > "$interactive_home/.config/opencode/plugins/bash-error-diagnostics.js"
printf '1\ny\n' | HOME="$interactive_home" "$ROOT/install.sh" >/dev/null
test -f "$interactive_home/.config/opencode/.agentarium-managed-plugins"

marker_home="$TEST_ROOT/marker"
mkdir -p "$marker_home/.claude/rules"
printf '%s\n' '<!-- BEGIN AGENTARIUM MANAGED INSTRUCTIONS -->' > \
  "$marker_home/.claude/rules/agentarium.md"
if HOME="$marker_home" "$ROOT/install.sh" --integrations 2 --force >/dev/null 2>&1; then
  exit 1
fi
test ! -e "$marker_home/.agents"

manifest_home="$TEST_ROOT/manifest"
mkdir -p "$manifest_home/.codex"
printf '%s\n' '{"hooks":"invalid"}' > "$manifest_home/.codex/.agentarium-managed-hooks.json"
if HOME="$manifest_home" CODEX_HOME="$manifest_home/.codex" \
  "$ROOT/install.sh" --integrations 3 --force >/dev/null 2>&1; then
  exit 1
fi
test ! -e "$manifest_home/.agents"

rm -f "$manifest_home/.codex/.agentarium-managed-hooks.json"
printf '%s\n' '{"hooks":"invalid"}' > "$manifest_home/.codex/hooks.json"
if HOME="$manifest_home" CODEX_HOME="$manifest_home/.codex" \
  "$ROOT/install.sh" --integrations 3 --force >/dev/null 2>&1; then
  exit 1
fi
test ! -e "$manifest_home/.agents"

printf '%s\n' '{"hooks":{"PreToolUse":[null]}}' > \
  "$manifest_home/.codex/.agentarium-managed-hooks.json"
if HOME="$manifest_home" CODEX_HOME="$manifest_home/.codex" \
  "$ROOT/install.sh" --integrations 3 --force >/dev/null 2>&1; then
  exit 1
fi
test ! -e "$manifest_home/.agents"

link_home="$TEST_ROOT/link"
mkdir -p "$link_home/.config/opencode/plugins"
printf '%s\n' 'retry-loop-detector.js' > "$link_home/.config/opencode/.agentarium-managed-plugins"
touch "$link_home/victim"
ln -s "$link_home/victim" "$link_home/.config/opencode/plugins/retry-loop-detector.js"
HOME="$link_home" "$ROOT/install.sh" --integrations 1 >/dev/null
test ! -L "$link_home/.config/opencode/plugins/retry-loop-detector.js"
test ! -s "$link_home/victim"

printf '%s\n' 'Installer tests passed.'
