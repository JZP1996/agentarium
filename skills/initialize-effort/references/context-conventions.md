# Maintaining and Extending an Effort

These are conventions to include in the effort's maintained rules, not permission to extend or reorganize an existing workspace during initialization.

## Document Responsibilities

- **README:** only the effort title and purpose. No navigation, status, repository table, or usage explanation.
- **CONTEXT:** the current objective, scope/non-goals, state, key decisions, blockers or unknowns, next steps, and evidence/navigation links. Use English for headings and content. Omit empty optional sections for a simple task.
- **AGENTS:** stable working rules, reading order, safety and verification boundaries. Temporary progress does not belong here.

Read root Context first to locate the task, then the applicable project README/Context and rules. Read historical reports or archive content only when needed for evidence. Applicable agent instructions still govern every operation; the reading sequence does not override them.

Update the current state in place. Do not keep prepending contradictory rounds of "uncommitted", "pushed", or "fixed" and ask readers to guess which wins. Put a useful historical narrative in a separate report and link it. Keep facts at the most specific responsible location; parent Context contains only necessary summaries and links. Promote decisions to the root only when they affect multiple projects. Update affected entry points, not every document on every change.

## Repository Register

For a small effort, use a compact list in root Context. For many repositories, use a separate register and link it. Each entry should distinguish:

- Repository identity, supplied path, and resolved path when different.
- What the repository does, versus its role in this effort.
- Relevant non-uses and role decisions still awaiting confirmation.
- Check date and timezone, branch or detached/unborn state, HEAD if any, and status summary.

Record the absence of HEAD honestly for an empty repository. Avoid dumping every changed filename unless it affects scope or safety. Repository snapshots expire: recheck before implementation and agree on baseline/branch choices then. Never normalize a checkout to a primary branch during initialization.

A read-only reference is not implicitly an implementation target, migration destination, behavior oracle, or compatibility promise. Evaluation and shared-tool repositories have their own roles and prerequisites; do not conflate them with product source.

## Grow Only with Actual Work

| Need | Later extension |
| --- | --- |
| A real research note or design document | `docs/` with that document |
| Planning has actually started | A plan file at the existing preferred location; create `plans/` only if useful |
| A concrete sample or validation input | `samples/` with that input |
| A separate active objective with its own evidence | `projects/<name>/README.md` and `CONTEXT.md` |
| Rules unique to a project or subarea | A local `AGENTS.md`; otherwise inherit root rules |
| A completed project, experiment, or phase that needs historical preservation | `archive/` with enough provenance and navigation to interpret it |

A declared future objective can be listed in Context without creating its folder. A project can remain active while a completed phase or experiment is archived. Archive only with authorization: preserve useful evidence links, label historical records, and update the affected current Context links rather than moving unrelated material. Do not automatically create archive indexes, subareas, or plan placeholders.

`.tmp/` is the optional location for disposable scratch files, not durable evidence. `worktrees/` is ignored only to keep any later explicitly requested implementation checkout out of the effort repository; no workflow requires creating one. Samples, reports and results are not blanket-ignored.

## Workflow References

Use original workflow entrances from the relevant repository or user-provided shared-tool location. A useful reference states entry, purpose, scope and missing prerequisites, not a copied Skill body. Read the current original at execution time and treat it under the task's applicable rules. Credentials or runtime requirements that are unavailable make it a reference, not proof of execution. Do not generate a workflow index when there is nothing relevant to register.
