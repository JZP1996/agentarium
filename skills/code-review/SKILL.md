---
name: code-review
description: Review a pull request or current diff for real bugs, regressions, and instruction violations. Use when asked to review code, review a PR, check changes, or audit a diff before merge.
license: Apache-2.0
metadata:
  origin: https://github.com/anthropics/claude-plugins-official/tree/b5eddebc6444d73108941ee698f25fa8759b8710/plugins/code-review
  upstream_file: plugins/code-review/commands/code-review.md
  local_modification: Converted the Claude Code command into a tool-neutral Skill; posting PR comments requires an explicit user request.
---

# Code Review

Review code changes for high-confidence issues that a senior engineer would want fixed before merge.

## Scope

- Prefer the pull request or diff the user named.
- If no PR is named, review the current branch diff against the repository's main branch when available.
- Focus on changed lines and the behavior they affect.
- Use nearby code, tests, docs, comments, and repository instructions only when they help verify a concrete concern.

## What To Flag

Flag issues that are likely real and important:

- Functional bugs or regressions.
- Broken edge cases introduced by the change.
- Incorrect assumptions about APIs, data shape, state, concurrency, or error handling.
- Violations of explicit project guidance from `CLAUDE.md`, `AGENTS.md`, or nearby documentation.
- Security issues with a concrete attack path.
- Missing validation only when the missing validation creates a concrete bug or vulnerability.

## What Not To Flag

Avoid low-signal comments:

- Style nits, formatting, import order, or issues a formatter, linter, or compiler should catch.
- Broad quality comments such as "add tests" unless a specific missing test allows a likely regression to ship.
- Pre-existing issues not introduced or exposed by the change.
- Speculative risks without a plausible failure path.
- Intentional behavior changes that are consistent with the PR description.

## Review Process

1. Identify the changed files and summarize the intent of the change.
2. Load relevant project instructions such as `CLAUDE.md` or `AGENTS.md` when they apply to the changed files.
3. Inspect the changed code first, then read nearby implementation or tests only as needed to verify a concern.
4. For each potential issue, check whether it is introduced by the change and whether it can happen in practice.
5. Keep only high-confidence findings. If uncertain, omit the finding or list it as an open question.

## Output

Start with findings, ordered by severity. For each finding include:

- A short title.
- The affected file or code location.
- Why it is a bug or regression.
- The concrete scenario where it fails.
- The smallest useful fix direction.

If there are no findings, say so clearly and mention any meaningful residual risk or test gap.

Do not post a PR comment or modify review threads unless the user explicitly asks you to do so.

## GitHub PRs

When reviewing a GitHub PR and `gh` is available:

- Use `gh pr view`, `gh pr diff`, and `gh pr diff --name-only` for PR context.
- Use full commit SHA links for any GitHub code references if preparing a PR comment.
- Before posting anything, repeat the eligibility check: ensure the PR is still open, not draft, and that the user asked for a posted review.
