# Validation Scope

Run from the maintenance repository root:

```sh
node --test skills/initialize-effort/tests/templates.test.js
uv run --managed-python --no-project --with pyyaml python skills/skill-creator/scripts/quick_validate.py skills/initialize-effort
```

The Node checks render the actual maintained templates in temporary directories, verify their links and bounded ignore rules, and exercise Git initialization/status and filesystem failure conditions with isolated configuration. Test helpers are not a production generator or an agent executor. No source checkout, real effort, commit, or implementation branch is created by these checks.

`../evals/evals.json` contains agent evaluation inputs and expected outcomes. Passing structural/fixture checks does not mean those scenarios have been executed by an agent. In particular, asking before writing, choosing repository roles, minimizing discovery, and proposing phase-level archiving still require behavioral evaluation. Report platform-specific checks that were not executed; a passing symlink fixture on one platform does not establish behavior on another.
