# Effort Working Rules

## Read the Current Context

- Read the root `CONTEXT.md` first, then determine whether the task belongs at the root or in an existing project. Read that project's README, Context, and applicable instructions before acting.
- Read historical reports and `archive/` only when needed for evidence. Archived status does not describe the current task.
- These navigation rules never override applicable repository instructions. Read source-repository guidance before any later authorized source changes.

## Keep One Current State

- README contains only the effort title and purpose. CONTEXT owns current goals, scope/non-goals, state, decisions, blockers/unknowns, next steps, and evidence/navigation links. AGENTS owns stable rules, not progress logs.
- Update current Context in place; do not accumulate contradictory status entries with "the above supersedes the below" explanations. Put historical process in a separate report and link it when useful.
- Distinguish verified facts, inferences, and unverified items. Record actual check dates and evidence; do not invent findings or completed work. Omit empty optional sections rather than filling out a large form.
- Maintain facts at the most specific responsible location. Parent Context keeps only necessary summaries and links; only cross-project decisions belong at the root. Update only the entry points affected by a change.

## Expand on Demand

- Create `docs/` only for actual documents, plan files only when planning starts, and `samples/` only for concrete examples or validation inputs. Do not create empty indexes or speculative structures.
- Independent active objectives may use `projects/<name>/README.md` and `CONTEXT.md`. Add local AGENTS only for unique rules; use subareas only when actual work needs them.
- Archive, with authorization, either a whole project or a completed experiment/phase inside an active project. Preserve historical evidence and repair affected links; do not automatically move existing material or declare the whole project complete.
- `.tmp/` is optional disposable scratch space. Keep durable evidence in appropriate documents; do not blanket-ignore samples, reports, or results. The `worktrees/` ignore rule is precautionary, not a requirement or authorization to create one.

## Roles and Workflows

- Distinguish repository purpose from effort role and explicit non-uses. A historical reference is not automatically a target, compatibility requirement, migration destination, or behavioral baseline.
- Branch, HEAD and working-directory status are dated observations, not permanent state or an approved implementation baseline. Recheck before implementation and confirm its location, baseline and any new branch with the user.
- Prefer relevant existing workflows; record their original entry, purpose and scope, and read the current original before use. Do not copy complete external Skills or scan all repositories by default. Missing tools, access or credentials mean reference-only, not executed work.

## Boundaries and Verification

- Initialization establishes context only. Do not begin research, implementation, experiments, deployment, migrations, or archival without a separate request.
- Preserve source checkouts and user changes. Do not reset, stash, discard, switch branches, pull, or overwrite files as part of setup. Do not create commits, feature branches, implementation worktrees or pull requests without explicit authorization.
- Existing directories are read-only until the user confirms specific changes. Repeated setup must not overwrite content or duplicate structure. Explain resolved symlink destinations and nested Git repository risks before writing.
- Report missing templates, write failures and Git failures explicitly, including partial outputs. Do not silently remove files or force a retry. Do not install global dependencies or record secrets.
- Validate actual outputs, remaining placeholders, local entry links and Git status. Report executed, failed and unrun checks separately; do not treat authored test cases as executed evaluations.

## Language

- Write CONTEXT headings and content in English. Use Simplified Chinese for README purpose and other non-code effort content unless requested otherwise. Keep source code, identifiers, comments, commands and commit messages in English.
