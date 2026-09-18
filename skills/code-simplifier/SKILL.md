---
name: code-simplifier
description: Simplify code for readability and maintainability without changing behavior. Use when the user explicitly requests cleanup, simplification, or readability refactoring; not for review-only requests or automatic post-edit cleanup.
---

# Code Simplifier

Make the requested code easier to understand while preserving its observable behavior. Edit only when the user requests changes; if they ask for suggestions, return proposals without applying them.

## Establish Scope and Conventions

- Prefer the files or code the user names. Otherwise, limit the work to the current task's changes; if that scope is unclear, clarify before editing.
- Read applicable repository instructions, formatter and linter configuration, and nearby code. Use the existing language, framework, and idioms; do not introduce conventions from another stack.
- Preserve existing user changes. Do not extend a local cleanup to unrelated files, repositories, or public interfaces.
- No particular model, hosting service, CLI, or delegation facility is required.

## Preserve Behavior

Keep inputs, outputs, public interfaces, error semantics, and side effects unchanged. Where relevant, also preserve evaluation order, laziness, resource lifetime, async ordering, and concurrency guarantees. A shorter expression is not equivalent if it changes any of these properties.

Do not silently fix a bug during cleanup. Report the behavior-changing issue separately and leave it outside the simplification unless the user explicitly expands the task.

## Choose Small Improvements

- Reduce nesting, duplication, or indirection when the result is genuinely easier to follow.
- Improve local names only when their meaning is unclear and the rename stays within scope.
- Prefer clear control flow over dense expressions, using constructs idiomatic to the actual language.
- Keep abstractions, comments, and explicit steps that explain intent or protect important invariants.
- Avoid broad formatting churn, new dependencies, new frameworks, and speculative abstractions.
- If the existing code is already clear, say that no useful simplification is needed rather than manufacturing changes.

## Validate and Report

1. Identify the behavior and relevant existing checks before editing.
2. Apply the smallest useful change. If equivalence is uncertain, prefer a focused characterization check or a smaller edit; otherwise explain the uncertainty and leave the risky transformation unapplied.
3. Run the narrowest relevant tests, static checks, or other executable validation available. Do not rewrite test expectations merely to make a changed behavior pass.
4. Inspect the final diff for unintended behavior changes and unrelated edits.
5. Report what became clearer, what checks actually ran, and any remaining limits. If validation is unavailable, state that explicitly rather than claiming proven equivalence.

Do not commit, push, publish review comments, or change remote state as part of simplification. Those actions require a separate explicit request.
