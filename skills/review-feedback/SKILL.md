---
name: review-feedback
description: Address existing code-review feedback when explicitly asked to implement requested changes, draft or send replies, or resolve review threads. Not for a new code review, general issue triage, or source-code comment cleanup.
---

# Review Feedback Addresser

Work through existing review feedback using the repository's actual hosting platform and available integrations. Keep local code changes, reply drafts, published replies, and thread resolution as separate actions.

## Establish Context and Authority

- Identify the repository, review target, relevant revision, and feedback from the user's supplied context. Inspect local repository metadata or available read-only integrations as needed; do not assume a hosting provider, remote name, default branch, CLI, API, model, or delegation facility.
- Read applicable repository guidance. Use the platform and tools already configured for that repository; do not install tools or change authentication just to follow this skill.
- Clarify missing information only when it blocks the requested action. If remote access is unavailable, work from supplied comments and code, state coverage limits, and return drafts rather than claiming remote actions succeeded.
- Interpret "address feedback" as assessing feedback and implementing appropriate local fixes by default, not permission to post, react, resolve threads, commit, or push. If the user explicitly requests replies or resolution, perform only those authorized remote actions.
- If the user asks only for an assessment or reply drafts, do not edit code. Avoid fetching unrelated discussions or expanding the task into a new full review.

## Assess and Implement

1. Read each comment in its thread context and check it against the current code. Distinguish valid, already addressed, outdated, disputed, and unclear feedback; do not accept a suggestion merely because it was posted by a reviewer.
2. Identify the actual behavior or requirement at issue. Group duplicate requests while retaining enough identifiers to report the outcome of every in-scope thread.
3. For valid feedback within the authorized edit scope, make the smallest useful change and preserve existing user modifications. Keep unrelated cleanup out of the patch.
4. Run focused validation for the changed behavior and inspect the final diff for follow-on issues. Report checks that could not run and do not substitute a proposed fix for verified completion.
5. For disagreement or ambiguity, explain the evidence or ask a targeted question. Leave unresolved decisions open rather than implementing a harmful suggestion or claiming completion.

## Reply and Resolve

- Draft concise, factual replies that match the actual outcome. Do not force every reply into one sentence, add automatic reactions, or claim a fix is published when it exists only locally.
- Before any authorized remote action, confirm the repository, review identifier, thread identifier, and current state. Check for existing replies and resolved threads to avoid duplicate actions on retries.
- Publish only when explicitly requested. Use the available native integration without prescribing a specific CLI or transport.
- Resolve only when explicitly requested, the feedback is actually addressed, and no discussion remains. If a code fix is still local or has not reached the reviewed revision, report it as ready for publication and leave the remote thread open.
- Report failed remote actions separately from successful local work. Do not blindly retry non-idempotent actions when the result is uncertain; inspect the remote state first.
- If the platform lacks a requested capability, explain the limitation. Do not silently replace resolution with closing the review, approving it, or another unrelated state change.

## Report

For each relevant comment or grouped request, identify its disposition, any changed files, validation evidence, and reply or thread state. Clearly distinguish draft, local fix, published reply, resolved, blocked, and needs-discussion outcomes.

End with remaining blockers and the next action. No commit, push, approval, merge, or unrelated remote mutation is implied by this workflow.
