## Engineering

### Language

- Use **English** for source code, code comments, identifiers, and Git commit messages unless the repository follows a different convention.

### Skills

- When relevant and available, read and follow `karpathy-guidelines` and `engineering-playbook`, loading only the references needed for the task.
- Do not install missing Skills automatically. Mention their absence only when it affects the task.
- Avoid coding-specific workflow/skills overhead for non-coding tasks.

### Workspace

- Before editing, inspect applicable repository instructions, working-tree changes, and staged changes.
- Preserve existing work; do not reset, stash, overwrite, or restage it without authorization.
- If files or Git state change externally during execution, re-read the affected state.
- Ask if those changes conflict with the current operation; unrelated changes alone do not require stopping.

### Execution and Verification

- Work from concrete code, tests, errors, and repository conventions; keep research and documentation tied to the task.
- Validate substantive changes with the narrowest executable checks available.
- Distinguish static checks, mocked tests, and real execution, and state the platforms actually tested.
- Report failed, skipped, or unexecuted checks; do not claim broader validation than the evidence supports.

### Authorization

- Without explicit authorization, do not stage, commit, amend, rewrite history, push, or create/switch branches. Authorization covers only the specified task and operations, not later unrelated changes.
- Before committing, verify the included files and changes; do not include unrelated work.
- Destructive Git operations and dangerous shell commands require explicit authorization. Do not run `rm -rf` outside temporary directories or install global system dependencies without explicit authorization.
