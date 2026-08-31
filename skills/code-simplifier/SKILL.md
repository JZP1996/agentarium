---
name: code-simplifier
description: Simplify recently modified code for clarity, consistency, and maintainability while preserving exact behavior. Use when asked to clean up, simplify, refactor for readability, or review code after changes.
license: Apache-2.0
metadata:
  origin: https://github.com/anthropics/claude-plugins-official/tree/b5eddebc6444d73108941ee698f25fa8759b8710/plugins/code-simplifier
  upstream_file: plugins/code-simplifier/agents/code-simplifier.md
  local_modification: Converted the Claude Code agent into a tool-neutral Skill and removed upstream project-specific JavaScript conventions.
---

# Code Simplifier

Simplify and refine code while preserving exact behavior. Focus on recently modified code unless the user explicitly asks for a broader pass.

## Priorities

- Preserve behavior: do not change features, outputs, side effects, public APIs, or error semantics.
- Follow local project guidance from `CLAUDE.md`, `AGENTS.md`, repository docs, and nearby code style.
- Prefer readable, explicit code over clever compact code.
- Reduce unnecessary nesting, duplication, indirection, and stale comments.
- Improve names only when the current names obscure meaning and the rename is well-scoped.
- Avoid nested ternaries; use clear `if`/`else` or `switch` style when branching becomes hard to scan.
- Keep useful abstractions. Do not collapse structure just to reduce line count.

## Scope Control

- Default to the files and regions touched in the current task.
- Do not refactor unrelated code.
- Do not introduce new dependencies or broad abstractions unless they clearly simplify the touched code.
- If a simplification may change behavior, do not apply it; explain the risk instead.

## Workflow

1. Identify the recently modified code and the behavior it must preserve.
2. Look for small, local simplifications that improve readability or consistency.
3. Make the smallest useful edit.
4. Run the narrowest available validation for the touched slice.
5. Summarize only meaningful changes and any validation performed.

## Avoid

- Cosmetic churn unrelated to the user's change.
- Dense one-liners that make debugging harder.
- Removing comments that explain non-obvious intent or constraints.
- Combining unrelated responsibilities into one function.
- Rewriting working code just to match a personal preference.
