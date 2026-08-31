# Agentarium

Personal instructions, Skills, and runtime integrations for OpenCode, Claude Code, and Codex.

## Install

Run interactively:

```sh
./install.sh
```

```powershell
.\install.ps1
```

Select `1` for OpenCode, `2` for Claude Code, and `3` for Codex. An empty selection installs only the shared core. For non-interactive use:

```sh
./install.sh --integrations 1,2,3
./install.sh --integrations ''
```

```powershell
.\install.ps1 -Integrations '1,2,3'
.\install.ps1 -Integrations ''
```

Node.js is required only for integrations. Claude marketplace registration additionally requires `claude`, `bash`, and `jq`.

Unmanaged files that conflict with Agentarium are listed before installation. Interactive mode asks before overwriting them; non-interactive mode stops unless `--force` or `-Force` is supplied.

OpenCode instructions use a symbolic link from `~/.config/opencode/AGENTS.md` to `~/.agents/AGENTS.md`. OpenCode discovers shared Skills directly from `~/.agents/skills`.

Codex instructions use a symbolic link from `$CODEX_HOME/AGENTS.md` (default `~/.codex/AGENTS.md`) to `~/.agents/AGENTS.md`. Codex also discovers shared Skills directly from `~/.agents/skills`; its hooks are managed separately through `$CODEX_HOME/hooks.json`.

## Operations

Re-run the installer to update managed content.

```sh
./doctor.sh
./uninstall.sh
```

```powershell
.\doctor.ps1
.\uninstall.ps1
```

Doctor verifies the shared core. Uninstall removes only manifest-, marker-, or directory-owned Agentarium content.

Set `AGENTARIUM_HOME` or use PowerShell's `-InstallDirectory` to change the core location. Windows and WSL use separate installations.

Windows requires Developer Mode or an elevated shell to create the OpenCode and Codex instruction symlinks.

See [Architecture](docs/architecture.md), [Security](SECURITY.md), and [Third-Party Notices](THIRD_PARTY_NOTICES.md).
