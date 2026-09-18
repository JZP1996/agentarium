# Instructions

Combines `base.md` and `engineering.md` into one shared `AGENTS.md`. Requires Node.js and curl.

## Install without cloning

After publication:

```sh
curl -fsSL https://raw.githubusercontent.com/JZP1996/agentarium/HEAD/instructions/install-instructions.sh | bash -s -- --agent codex
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/JZP1996/agentarium/HEAD/instructions/install-instructions.ps1))) -Agent codex
```

**Agent selection is required; there are no defaults.** Currently supported: `codex` and `opencode`. For both, use `--agent codex opencode` in Bash/Node or `-Agent @("codex", "opencode")` in PowerShell. Unknown names fail before downloads; unlike Skills CLI, this installer needs a known Instructions destination.

**Do not pass `"codex opencode"` as a single quoted string.** Bash uses separate arguments; PowerShell uses an array.

Preview:

```sh
curl -fsSL https://raw.githubusercontent.com/JZP1996/agentarium/HEAD/instructions/install-instructions.sh | bash -s -- --agent codex --preview
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/JZP1996/agentarium/HEAD/instructions/install-instructions.ps1))) -Agent codex -Preview
```

Remove the preview option to install. With a checkout, `node instructions/install-instructions.js --agent codex` previews local content; add `--install` to install.

## Files and updates

| File                                      | Purpose                                                     |
| ----------------------------------------- | ----------------------------------------------------------- |
| `~/.agents/AGENTS.md`                     | Combined Instructions                                       |
| `~/.agents/.agentarium-instructions.json` | Hash of the last installed Instructions, for edit detection |
| `~/.codex/AGENTS.md`                      | Link to shared Instructions                                 |
| `~/.config/opencode/AGENTS.md`            | Link to shared Instructions                                 |

`AGENTARIUM_HOME`, `CODEX_HOME`, and `XDG_CONFIG_HOME` override the corresponding directories. The installer does not copy source fragments or a lifecycle manager into the home directory. Re-run to update; edit this repository rather than the installed copy.

- Downloads and destination checks finish before deployment. Every file/link is staged before destinations are replaced. A later write failure is reported, not silently ignored; completed writes are not rolled back.
- Existing unmanaged files, foreign links and local edits stop installation. After review, `--force` / `-Force` permits replacing those entries. It replaces foreign links, not the files they point to. Directories, unsafe shared-file links and invalid records cannot be forced.
- The record manages only the shared Instructions file. Correct native links are retained; unselected agent entries are not removed. Updating shared content also affects any existing links to it.
- Windows requires permission to create file symlinks. No copy fallback or automatic execution-policy/permission change is made. Windows and WSL remain independent.
- Clean previous installations manually. There is no migration, uninstall command, background updater, or global dependency installation.
