---
name: code-review
description: Review a specified diff, commit, pull request, or code scope for actionable defects and regressions. Use for explicit code-review requests; not for readability rewrites, implementing fixes, or publishing review comments.
---

# Code Review

Find actionable defects in the requested code. Review only: return findings to the user without editing source files or publishing them externally.

## Establish the Target

- Use the user's specified files, diff, commit, or review target. For change reviews, inspect both the changed lines and the behavior they affect.
- If no target is specified, inspect repository status first. Review staged and unstaged changes when they are the obvious target; otherwise establish the intended base before reviewing a branch. Do not assume a branch named main or master.
- For multiple repositories, identify each repository and its comparison base separately. Follow interface changes across repositories only when relevant to the requested review.
- Read applicable repository instructions, contributing guidance, and nearby tests. Apply the actual language and framework conventions rather than importing another project's preferences.
- Use the available local diff or read-only integration. No particular hosting service, CLI, model, or delegation facility is required. If remote context is unavailable, state the limitation rather than inventing it.

## Evaluate Findings

Report concrete correctness, security, compatibility, or reliability problems. Verify each finding against the relevant callers, contracts, configuration, or tests.

For each candidate, establish:

1. The condition or input that reaches the problem.
2. The observable incorrect behavior and its impact.
3. The code location responsible for it.
4. For change reviews, whether the change introduced or exposed the problem.

Do not present style preferences, speculative risks, or missing tests without a concrete failure as defects. Exclude unrelated pre-existing issues from change reviews; when reviewing an explicitly named existing-code scope, assess defects within that scope.

Run focused, non-destructive checks when they materially resolve uncertainty. Do not modify source, snapshots, or baselines to make checks pass. Ask before checks that require external mutations or unavailable permissions. Distinguish confirmed evidence from untested reasoning, and do not claim that checks ran when they did not.

## Report

Follow the user's requested output format. Otherwise, list findings in descending impact order. Each finding should contain:

- A short title and severity appropriate to the impact.
- The repository, file, and narrowest useful line range.
- The failing condition, incorrect behavior, and why the code causes it.
- A minimal fix direction, not an unsolicited patch.

If there are no actionable findings, say so and state meaningful coverage limits. Put unresolved questions separately from confirmed defects. Mention checks performed and any important missing context.

## Optional Refactoring Assessment

When explicitly asked to assess a refactoring proposal, evaluate the concrete problem, likely benefit, affected interfaces and files, validation, and the option to leave the code unchanged. Separate these recommendations from defect findings; style preferences are not bugs. Return a recommendation without applying it. Any implementation requires the user's explicit approval and an appropriate scope.

## Boundaries

- Do not turn a review into a simplification or implementation task.
- Do not commit, push, approve, post comments, or change remote review state. Publishing feedback is a separate user-authorized task, not part of this skill.
- Do not prescribe a model, parallel-agent count, or provider-specific tool. Use the current environment and permissions.
