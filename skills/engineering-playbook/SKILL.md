---
name: engineering-playbook
description: Apply personal engineering preferences during coding, script execution, testing, or development-environment work. Load only the relevant bundled reference; not a standalone review, refactoring, or deployment workflow.
---

# Engineering Playbook

Use this Skill as the single entry point for personal environment and language preferences. The references belong to this Skill; no other Skill is required.

## Load Only What the Task Needs

| Task | Reference |
| --- | --- |
| Install or select development tools, check tool availability, or diagnose runtime/PATH issues | [environment.md](references/environment.md) |
| Write, edit, or execute Python, including one-off helpers, modules, tests, and Python tools | [python.md](references/python.md) |

If both concerns are present, read both. For other-language code with a working environment, follow repository conventions without loading unrelated references. Reassess when the task changes, such as introducing a Python helper during a non-Python task.

## Apply Preferences Without Expanding Scope

Follow the user's explicit requirements and the project's established conventions. Apply optional preferences only to unspecified choices. If a stated personal execution policy conflicts with an existing setup, explain the conflict and ask rather than silently migrating the project or bypassing the policy.

Inspect before changing anything. Uncertain installation methods, versions, or project/global scope require a user decision. Loading this Skill does not authorize installing software, editing global defaults, refactoring code, or publishing changes.
