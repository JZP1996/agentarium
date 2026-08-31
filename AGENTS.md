# Instructions

## Boundaries

- This repository owns shared instructions, Skills, and tool-specific runtime extensions. Credentials and machine-local state belong elsewhere.
- Agentarium owns only `AGENTS.md`, `instructions/`, and `skills/` under the core directory; preserve unrelated top-level files.
- Install copies, not links. Keep Bash and PowerShell installer behavior equivalent.
- Validate selections and manifests before writing. Ask before overwriting unmanaged conflicts; non-interactive installs require explicit force. Remove only content identified by Agentarium manifests, markers, or owned directories.
- Do not modify Claude Code or OpenCode permission settings.
- OpenCode and Codex link their native global instruction files to the shared core. Claude uses a namespaced rule and manifest-managed Skill copies.
- Keep Windows and WSL installations separate.

## Content

- Reusable prompt behavior belongs in `instructions/` or `skills/`; event behavior belongs in the relevant integration.
- Claude, OpenCode, and Codex implementations follow different event and security models; do not assume byte-for-byte portability.
- Keep `skills/sources.json` and `THIRD_PARTY_NOTICES.md` aligned. Only `verbatim` sources may be refreshed automatically.
- Keep `skills/skill-creator` complete, including scripts, references, assets, agents, and license.

## Verification

```sh
bash -n install.sh uninstall.sh doctor.sh tests/install.test.sh
git diff --check
git diff --cached --check
for skill in skills/*/; do test -f "$skill/SKILL.md" || exit 1; done
for file in integrations/opencode/plugins/*.js; do node --input-type=module --check < "$file" >/dev/null || exit 1; done
for test_file in integrations/claude-code/marketplace/plugins/*/tests/*.sh; do bash "$test_file" || exit 1; done
node integrations/codex/tests/run-hook.test.js
tests/install.test.sh
```

Use an isolated `HOME` for installer tests. Parse PowerShell files with `pwsh` when available. `scripts/check-secrets.sh` requires gitleaks.
