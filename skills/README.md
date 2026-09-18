# Skills

## Install without cloning

Requires Node.js/npm, Git and curl. After publishing these files:

```sh
curl -fsSL https://raw.githubusercontent.com/JZP1996/agentarium/HEAD/skills/install-skills.sh | bash -s -- --agent codex
```

Windows PowerShell (no Bash required):

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/JZP1996/agentarium/HEAD/skills/install-skills.ps1))) -Agent codex
```

Installs **all personal Skills** from `JZP1996/agentarium` and **selected upstream Skills** from [awesome-skills.json](awesome-skills.json), using latest published content, user-level copies, and explicitly supplied agent targets. Skills CLI owns these installations. Instructions and plugins are not installed.

Agent selection is required; there are no defaults in the installer or catalog. Use `--agent codex opencode` in Bash/Node or `-Agent @("codex", "opencode")` in PowerShell for multiple targets. Names are forwarded as individual Skills CLI `--agent` values; the CLI determines which names it supports.

**Do not pass `"codex opencode"` as a single quoted string.** Bash uses separate arguments; PowerShell uses an array.

Preview before installing:

```sh
curl -fsSL https://raw.githubusercontent.com/JZP1996/agentarium/HEAD/skills/install-skills.sh | bash -s -- --agent codex --preview
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/JZP1996/agentarium/HEAD/skills/install-skills.ps1))) -Agent codex -Preview
```

Downloads execute trusted code. Both shell entries download the same JS helper automatically; no manual download or checkout is needed. Local edits only become available remotely after publication.

PowerShell also accepts `-Catalog <path-or-HTTPS-URL>` and `-Help`. It resolves native `node.exe`, `curl.exe` and `npx.cmd` on Windows; no execution-policy changes or automatic dependency installation are made. Windows and WSL installations are separate.

With a checkout, `node skills/install-skills.js --agent codex` previews; add `--install` to install. An optional catalog path or HTTPS URL before `--agent` replaces the upstream selection, not the personal Skills.

## Safety

- Fresh or migrated installations only: any Skills still owned by the old Agentarium manager block installation, even with `--force`.
- Because personal Skills are discovered with a wildcard, any existing non-hidden entry in the selected Skill directories requires review and explicit `--force`. This conservative check can include unrelated Skills; it does not delete them. Hidden system directories are excluded.
- `--force` permits replacement of existing copies; review local edits first. To pass it remotely, use `bash -s -- --agent codex --force`, or append `-Force` to the PowerShell command.
- Destination checks cover shared Skills and selected Codex/OpenCode directories. For other agent names, review their existing Skills and supply `--force`; the installer does not maintain a duplicate registry of CLI agent paths.
- Failure stops further installs; earlier successful installs are not rolled back.

## Personal Skills only

These direct CLI commands bypass the installer's conflict checks:

```sh
npx skills@latest add JZP1996/agentarium --list
npx --yes skills@latest add JZP1996/agentarium --skill '*' --global --agent codex opencode --copy --yes
```

The quoted wildcard includes future personal Skills. Do not use `--all`, which also broadens agent selection. Upstream installation remains limited to the JSON selection.

Clean previous installations manually before using this entry. No legacy migration or cleanup is performed. Install [Instructions](../instructions/README.md) separately.
