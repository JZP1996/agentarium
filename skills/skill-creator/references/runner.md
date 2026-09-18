# Optional Agent Adapter

The common workflow needs no particular runtime. Automated discovery evaluation and description generation require a user-configured adapter; no adapter is bundled for a specific provider.

Set `SKILL_CREATOR_RUNNER` to a JSON argument array, for example:

```text
["/absolute/path/to/runtime", "/absolute/path/to/your-adapter"]
```

The program is launched without a shell, in a temporary directory, with one JSON request on stdin. Use absolute paths because the working directory is not the source repository. The environment is inherited for the user's chosen runtime; do not embed secrets in the argv or configuration value. Temporary directories are not a security sandbox. Only configure trusted adapters, and ensure they enforce authorized filesystem, network, model-use, and subprocess access. Adapters must clean up their own spawned descendants on cancellation or timeout.

## Trigger Request

```json
{
  "version": 1,
  "operation": "trigger",
  "query": "Review this diff",
  "skill": {"name": "code-review", "description": "Review a code change"},
  "project_root": "/path/to/test-fixture",
  "model": null
}
```

The adapter must expose the candidate through the chosen agent's real discovery mechanism in an isolated environment, execute the query, and observe selection or reading of the Skill. It must not register anything in the user's live agent configuration. The supplied project root is context, not blanket write permission.

Return one JSON object on stdout:

```json
{"triggered": true, "evidence": "The isolated run recorded reading code-review/SKILL.md."}
```

`triggered` must be boolean and `evidence` must describe an actual observation, including the completed-run evidence for negative results. A synthetic classifier or self-reported guess is not a substitute. The scripts validate the response shape but cannot independently prove that the adapter's evidence is true.

## Generation Request

```json
{"version": 1, "operation": "generate", "prompt": "Propose a description...", "model": null}
```

Return `{"text": "..."}` with non-empty text. The optional model is supplied by the user; null means keep the adapter's configured default. The result is a proposal, not authorization to modify the source Skill.

## Failures and Limits

Exit nonzero on execution failure. Missing configuration, timeout, invalid JSON, missing evidence, and nonzero exit abort evaluation rather than counting as a successful negative. Keep diagnostics on stderr and JSON alone on stdout. Do not put credentials in outputs. The wrapper does not echo arbitrary failed adapter output.

From the skill-creator directory, use `python -m scripts.run_eval --help` or the corresponding improvement/loop module for arguments. Start with one worker and one run per query. Parallelism, repeated runs, and model costs require an agreed budget. Offline validation, packaging, result aggregation, and manual evaluation remain available without an adapter.

The optimization loop can produce HTML and JSON reports. It does not apply the selected description automatically. Browser opening is opt-in via `--open-report`. Compare held-out results as diagnostics; do not claim repeated optimization against them is an unbiased final test.
