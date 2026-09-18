---
name: write-commit
description: Draft a commit message for a specified diff or set of changes when explicitly requested. Respect repository message conventions; generate text only, without staging files, creating commits, or changing Git state.
---

# Write Commit

Produce one accurate commit message from the requested changes. Do not execute a commit, stage files, amend history, or push.

## Establish the Changes

- Prefer the user's supplied diff, described changes, or explicitly selected files and revisions.
- Otherwise inspect Git status and the staged diff first. If staged changes exist, base the message on them and do not fold in unrelated unstaged changes.
- If nothing is staged, use the current task's changes only when their scope is clear. Ask when several unrelated changes, repositories, or possible targets make the intended commit ambiguous. Do not stage files to resolve that ambiguity.
- Review the selected diff and relevant repository guidance or recent message conventions. If only a user description is available, use it without inventing code changes or validation results.
- If there is no meaningful change to describe, say so instead of manufacturing a message.

## Compose the Message

Use English unless the user or repository explicitly requires another language. Follow established repository conventions. Otherwise prefer Conventional Commits:

```text
<type>(<optional-scope>)<optional-!>: <summary>
```

Choose a type that describes the intent, such as feat, fix, refactor, docs, test, perf, build, ci, chore, or style. Use a scope only when meaningful or conventional for the repository. Keep the summary concise, imperative, and without a final period. Do not lowercase proper names, acronyms, identifiers, or issue keys merely to enforce a style rule.

Default to a single subject line. Include a short body when needed to explain a non-obvious reason, migration, or important constraint. For an actual breaking change, use the repository's breaking-change convention; otherwise use `!` and a `BREAKING CHANGE:` footer that explains the impact. Do not infer a breaking change solely from a large diff.

## Output

Return one copyable text block containing the message, without unnecessary preamble or reasoning. Respect an explicitly requested output format or length. Ask a needed scope question before producing a misleading message. Drafting a message is not evidence that a commit was created.
