# Agentarium

Personal Skills and shared Instructions for coding agents.

## Requirements

- Node.js and curl.
- npm/npx and Git for Skills.
- File-symlink permission for Instructions on Windows.

## Agent selection

Replace `<agent>` in the commands below before running:

| Shell          | One agent       | Multiple agents                 |
| -------------- | --------------- | ------------------------------- |
| Bash / Node.js | `--agent codex` | `--agent codex opencode`        |
| PowerShell     | `-Agent codex`  | `-Agent @("codex", "opencode")` |

## Skills

Install personal Skills and selected upstream Skills without cloning:

```sh
curl -fsSL https://raw.githubusercontent.com/JZP1996/agentarium/HEAD/skills/install-skills.sh | bash -s -- --agent <agent>
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/JZP1996/agentarium/HEAD/skills/install-skills.ps1))) -Agent <agent>
```

## Instructions

Install shared rules and link them to selected agents:

```sh
curl -fsSL https://raw.githubusercontent.com/JZP1996/agentarium/HEAD/instructions/install-instructions.sh | bash -s -- --agent <agent>
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/JZP1996/agentarium/HEAD/instructions/install-instructions.ps1))) -Agent <agent>
```

## Preview

Use `--preview` / `-Preview` to inspect before installing.
