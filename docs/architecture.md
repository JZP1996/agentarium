# Architecture

## Shared Core

`instructions/` and `skills/` are the source of truth. Installers copy them to `~/.agents` by default and compose `~/.agents/AGENTS.md`.

OpenCode and Codex discover `~/.agents/skills` natively. Claude receives manifest-managed copies under `~/.claude/skills`.

## Integrations

| Tool        | Instructions                           | Runtime                                         | Ownership                                             |
| ----------- | -------------------------------------- | ----------------------------------------------- | ----------------------------------------------------- |
| OpenCode    | `~/.config/opencode/AGENTS.md` symlink | `~/.config/opencode/plugins/`                   | Symlink and `.agentarium-managed-plugins`             |
| Claude Code | `~/.claude/rules/agentarium.md`        | `~/.claude/agentarium/` and marketplace plugins | Marked rule, Skill manifest, and marketplace manifest |
| Codex       | `$CODEX_HOME/AGENTS.md` symlink        | `$CODEX_HOME/agentarium/` and `hooks.json`      | Symlink and `.agentarium-managed-hooks.json`          |

Unknown user files and configuration remain user-owned. OpenCode and Claude permission settings are not edited directly. Codex hook updates reconcile only exact manifest-owned groups.

Installed copies remain usable if the source repository moves. Re-run the installer to update them; use the uninstaller to remove owned content.
