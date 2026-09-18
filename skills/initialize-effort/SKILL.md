---
name: initialize-effort
description: Initialize a separate effort workspace with durable context when the user explicitly requests an effort or planning workspace. Supports research-only work and multiple repository roles; not for starting research, implementation, or reorganizing existing material.
compatibility: Git is required to initialize the independent effort repository.
---

# Initialize Effort

Establish a small, maintainable working context as an independent Git repository. Initialize the framework only: do not start research, experiments, implementation, deployment, source migration, or archiving. Do not create implementation worktrees, feature branches, or commits.

## Intake and Read-Only Inspection

Ask only for information not already established:

- Effort name, objective, expected outcome, and important scope exclusions.
- Parent directory and intended target. Accept the user's platform-native paths; resolve relative paths against an agreed location and confirm the resulting absolute destination.
- Relevant source repositories, **if any**, and their roles. Research-only efforts may have no source repositories; an explicit statement that none are needed is sufficient.

For each relevant repository, inspect its applicable instructions, root documentation, Git root, branch (or detached/unborn state), HEAD when available, and working-directory status read-only. Disable optional Git index refresh when inspecting status. A dirty checkout or non-default branch is information to preserve, not something to fix. Do not fetch, pull, switch branches, stage, or change Git configuration. Inspect remote identity only when needed and never record embedded credentials.

Distinguish **purpose** from **role**: implementation target, evaluation tooling, read-only reference, shared tooling, or another user-defined role. Record necessary non-uses, especially when a historical reference is not an implementation target, compatibility requirement, migration destination, or behavioral baseline. Propose unclear roles for confirmation rather than infer them from repository names. Record branch, HEAD and dirty/clean status with the check date and timezone; this is an observation snapshot, not approval of a later implementation baseline.

For paths containing spaces or symlinks, preserve the user-facing path and establish the resolved destination before writing. Quote shell arguments or pass argument arrays; do not assume a particular shell. Check whether the target or its resolved parent is inside another Git repository. Explain a nested repository's tracking/confusion risks and obtain confirmation or an alternate location before initialization; do not silently alter the enclosing repository's ignore rules.

If the target already exists, inspect it read-only first, including an empty directory or a symlink to an existing location. Report the current contents and Git state. **Do not copy, fill, or initialize anything there without confirmation of the specific changes.** For approved additions, create only the named missing files; for approved edits, apply the agreed change rather than replacing a document with its template. Repeated invocation is not permission to refresh templates, reset context, or append duplicate sections. If already initialized and no changes are requested, report that and stop.

## Build from the Maintained Templates

1. Confirm the resolved target and any outstanding roles or boundaries before mutation. Verify Git is available and all four files in `templates/effort/` are readable before creating output. If a template or prerequisite is missing, stop and report it; do not improvise a replacement or install global dependencies.
2. For a new target, create only the agreed destination and copy the maintained template files without overwriting existing content. Use exclusive creation/copy behavior and stop if another process creates a conflicting file. Do not rerender the framework from memory.
3. Fill the templates from confirmed inputs and observed facts. Write Context headings and generated content in English, and keep the maintained AGENTS rules, code, commands, and identifiers in English. README purpose and other non-code effort prose default to Simplified Chinese unless requested otherwise. README contains only `# {{EFFORT_NAME}}`, a blank line, and `{{PURPOSE}}`; do not add navigation, status, repository tables, or usage instructions. Context owns the current snapshot and useful navigation; AGENTS contains stable working rules. Initialization and document-role explanations belong in this Skill, not the generated README.
4. In Context, record the objective, scope/non-goals and the immediate next step. Add decisions, blockers/unknowns and evidence links only when there is something concrete to record. Explicitly distinguish verified observations, inferences, and unverified questions. Initialization itself is the only completed work to claim; do not invent research findings or evidence.
5. Keep a small repository register in Context. If the list would obscure the current state, use an agreed separate register such as `repositories.md` and link it from Context; README remains title and purpose only. Research-only efforts need no repository table. See [context-conventions.md](references/context-conventions.md) for registration and expansion conventions.
6. Initialize Git only for this effort, preserving source repositories and any enclosing checkout. An existing effort repository does not need reinitialization. If copying, writing, or Git initialization fails, stop, report the exact failure and files already created, and leave existing content intact. Do not silently delete partial results, retry with force, or claim completion. Before any retry, inspect the target again and confirm the specific recovery actions.

The default skeleton is exactly `AGENTS.md`, `CONTEXT.md`, `README.md`, and `.gitignore`. Do not create empty `docs/`, `plans/`, `samples/`, `projects/`, or `archive/`. Optional extensions are conventions for later work, not initialization steps.

## Existing Workflows

When the declared task or a repository's entry documentation points to an existing Skill or workflow, record its original entry, purpose, applicable scope, and known prerequisites where useful. Read the current original when actually using it; do not copy the entire workflow into the effort. Limit discovery to supplied locations and relevant entry documents, not all files in all repositories. No relevant workflow means no empty workflow index. Tool locations come from the user or environment, never a baked-in personal path. Without required tools, access, or credentials, label a workflow as procedural reference only, not executed.

## Completion Checks

Before reporting success:

- Read the created files and remove unresolved `{{...}}` placeholders. Remove unused optional sections instead of leaving empty forms; keep real unknowns explicit.
- Verify Context and rules exist, any local links resolve, README contains only the rendered title and purpose, and only the intended files were created. `.gitignore` excludes `worktrees/` and `.tmp/`, not evidence directories or all result files. These exclusions do not create or authorize either directory.
- Inspect the effort's Git status and resolved repository root. Ensure Git actually initialized in the approved target, not merely inherited a parent repository. Report untracked/staged files accurately; do not stage or commit them.
- Compare the relevant source repositories' observed status and HEAD with the initial snapshot without changing them. Report unexpected differences; do not reset them or attribute concurrent changes to yourself without evidence.

Report the absolute effort location, created files, repository roles and dated observations (or research-only scope), validation performed, and remaining unknowns. State that no research, experiments, source edits, commits, feature branches, implementation worktrees, or file migrations were performed. Separate failed or unrun checks from completed ones.
