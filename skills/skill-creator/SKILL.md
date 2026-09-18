---
name: skill-creator
description: Create or improve a reusable Skill when the user explicitly requests one, including its trigger description, workflow, resources and evaluation cases. Use existing project conventions; not for ordinary task execution or unsolicited Skill installation.
license: Apache-2.0
---

# Skill Creator

Create useful, narrowly scoped Skills that work across agents without assuming a model, hosting service, tool name, discovery directory, or execution backend.

## Confirm Intent Before Changing Behavior

Establish the capability, intended users and agents, typical requests, expected outputs, exclusions, and allowed side effects. Reuse decisions already made in the conversation. Ask about choices that materially change the workflow rather than silently choosing defaults for the user.

For an existing Skill, inspect its complete directory and relevant callers before editing. Preserve unrelated changes, resource files, and applicable license files. Do not rename, relocate, publish, install, or remove resources without authorization. Distinguish source editing from deployment to an agent's installed copy.

## Write the Smallest Useful Skill

- Use a stable lowercase hyphenated name and a concise description of when it applies. Include likely negative triggers; do not broaden the trigger just to increase invocation rates.
- Put execution details in SKILL.md, not in the description. Focus on decisions the agent needs help making, not generic advice or rigid ceremony.
- Follow the repository's language, tooling, instructions, and permission boundaries. Do not require a specific model, CLI, API provider, or number of subagents.
- Include scripts only for genuinely repeatable operations, references for supporting detail, and assets for actual templates. Do not create empty scaffolding or placeholder resources.
- Explain inputs, outputs, meaningful failure conditions, and what requires user confirmation. A Skill is not permission to mutate external state.
- Keep provider-specific metadata optional and separate from the portable workflow. Avoid naming collisions with built-in Skills; report a collision rather than silently replacing one.

## Evaluate Proportionally

Agree on a few realistic positive cases, near misses, and safety or failure cases. For significant revisions, preserve a baseline in an authorized temporary workspace. Keep identical task inputs and comparable execution settings when comparing versions.

Use the current agent's available tools or the user's chosen evaluation environment. Do not assume subagents exist or launch them without authorization. If independent execution is unavailable, perform a clearly labeled manual review and explain its limitations; do not fabricate invocation rates, scores, timing, or token usage.

Distinguish two evaluation goals:

- **Discovery:** whether an agent actually selects or reads the Skill when appropriate. Asking a model whether it would select a description is a prediction, not observed invocation evidence.
- **Execution:** whether the selected Skill produces the requested outcome, respects boundaries, and handles failure. Inspect artifacts and tool effects rather than judging only persuasive prose.

Start with the smallest useful evaluation, inspect failures, then propose focused improvements. Do not change unrelated workflows, overfit descriptions to test wording, or apply a proposed description without the user's authorization. Stop at the agreed budget or when further work needs a decision.

## Available Resources

- `agents/grader.md`, `agents/comparator.md`, and `agents/analyzer.md` provide optional evaluation role instructions. They are reference material, not commands to spawn agents.
- `references/schemas.md` describes result formats for grading, comparisons, benchmarks, and feedback.
- `scripts/quick_validate.py` checks Skill metadata; it does not prove behavioral quality. It requires PyYAML in the chosen environment.
- `scripts/package_skill.py` creates a portable archive after validation. Run `python -m scripts.package_skill <skill-directory> <output-directory>` from this Skill directory. Choose an output directory outside the source; existing archives and non-excluded symbolic links are rejected. Common secret files, VCS state, environments, caches, and old archives are excluded, but filenames are not a complete secret scan: inspect the input before sharing. Creating an archive does not install it in any agent.
- `scripts/aggregate_benchmark.py` aggregates existing evaluation results; `eval-viewer/generate_review.py` and the HTML resources support optional human review. Explain dependencies and output paths before running them.
- `scripts/run_eval.py`, `scripts/improve_description.py`, and `scripts/run_loop.py` are optional automation through an explicitly configured JSON adapter. Read [runner.md](references/runner.md) first. They never choose an agent automatically and fail clearly when no adapter is configured.

## Deliver

Report the changed files, actual checks and evaluations, observed limitations, and any pending choices. Return the result in the format the user requested. Do not claim that structural validation proves trigger accuracy or that generated evaluation cases have been executed. Keep installation, publication, commits, and remote actions separate unless explicitly requested.
