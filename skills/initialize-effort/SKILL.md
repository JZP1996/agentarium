---
name: initialize-effort
description: Create an AI-assisted feature effort that keeps planning context separate from source repositories. Use when the user asks to create an effort folder, set up a feature workspace, or organize research and implementation across repositories.
compatibility: Git when source repositories are involved
---

# Initialize Effort

Create a feature-specific effort as an independent Git repository for planning, research, decisions, and validation evidence. This skill only establishes the effort framework; it does not begin research, implementation, or create worktrees.

## Intake

Ask only for information not already stated. Do not create files, initialize Git repositories, fetch, switch branches, pull, or create worktrees until intake is complete.

1. Ask for the effort name. Prefer a lowercase kebab-case directory name.
2. Ask for the goal and expected outcome.
3. Ask for absolute paths to source repositories that may be relevant.
4. Ask for the absolute parent directory for the effort.

After source paths are provided, inspect each repository read-only: verify it exists and is a Git repository; inspect `git status --short --branch`, its configured remotes, and its root `README` when present. Report its observed purpose, current branch, and whether it is clean. Ask the user to correct mistaken inclusions before proceeding.

If the target effort directory already exists, inspect it read-only and report its current purpose and Git status. Do not copy templates, initialize Git, or modify files until the user confirms the specific files to add or change. Never overwrite existing files.

## Setup

For a new effort:

1. Preserve all existing source-checkout changes. Never reset, stash, discard, switch branches, pull, or modify sources.
2. Copy `templates/effort/` into `<efforts-root>/<effort-name>/`. Do not recreate template files manually.
3. Replace the root `README.md` placeholders with the objective and current status. Add one repository-table row per source repository with its path, observed purpose, branch, and status; remove the placeholder row. Leave unknown fields as `pending verification`.
4. Initialize the new effort directory as its own Git repository. Do not create a commit unless the user explicitly requests one.

The generated `AGENTS.md` is in English. Keep other non-code prose in the effort directory in Simplified Chinese unless the user requests otherwise.

## Completion Report

Report the effort path, uncommitted documentation changes, and every source repository with its observed purpose, branch, and status. State clearly that no source checkouts were modified and no worktrees were created.
