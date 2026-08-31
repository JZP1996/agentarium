# Agent Instructions

## Scope

- Keep planning, research, decisions, and validation evidence in this `effort` directory.
- Keep source-code changes in the corresponding implementation worktree; do not add source code here unless it is a sample or fixture.
- Read the repository's own `AGENTS.md` and contributing guidance before making code changes.

## Language

- Use Simplified Chinese for non-code prose in this effort directory.
- Use English for source code, code comments, identifiers, tests, commit messages, and implementation-specific documentation.
- Use English in Markdown code blocks, commands, paths, branch names, API contracts, configuration, and test instructions.

## Git Safety

- Do not reset, stash, discard, or overwrite existing user changes.
- Do not create commits, branches, or pull requests unless explicitly requested.
- During research, use source repositories as read-only baselines. Do not modify source code, switch branches, or pull.
- Before implementation, confirm the affected repositories, baseline revisions, and feature branch names.
- Keep each source checkout on its primary branch. Create a separate implementation worktree and feature branch for source changes; do not modify source checkouts.
- Add `worktrees/` to this effort's `.gitignore` before creating implementation worktrees, and do not commit nested worktrees to this effort repository.
- Do not force-remove a worktree or delete a branch without explicit approval.

## Verification

- Record assumptions, decisions, and unresolved questions in the appropriate document.
- Run the narrowest relevant validation after substantive changes and record the command and result.
