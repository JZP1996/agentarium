# Python

The uv execution policy below applies to all Python work. Apply the remaining tooling and coding preferences only for choices the project has not already made. Check its configuration, lockfiles, documentation, and nearby code first. An established formatter does not settle every other choice; apply the relevant preference individually rather than replacing the project's toolchain.

## Python Execution Policy

- Execute every Python script, snippet, module, test, and CLI through uv or uvx, using uv-managed Python. Use `--managed-python` so a Python on PATH, including a mise installation, is not silently selected.
- Do not install or select Python with mise, execute Python through `mise exec`, use bare `python`/`python3`, or launch a script directly through an interpreter shebang.
- Standalone script: `uv run --managed-python --no-project script.py`. Temporary dependencies: add `--with <package>` only when needed and authorized.
- Project module or tests: `uv run --managed-python python -m <module>` or `uv run --managed-python pytest`. Respect the existing project and its lockfile.
- One-off tool: `uvx --managed-python <tool>`. A short interpreter invocation can use `uvx --managed-python python -c "print(1)"`.
- uv may download an interpreter or packages. If it is unavailable, downloads are disallowed, or an existing environment is incompatible, explain the blocker and ask rather than falling back to mise or system Python. Do not delete existing environments or uninstall interpreters automatically.

## Interpreter and Project Dependencies

- Prefer uv for a Python project's interpreter selection, virtual environment, dependencies, and lockfile. Inspect `requires-python`, `.python-version`, and existing environment configuration before selecting an interpreter.
- Use a compatible uv-managed interpreter and verify `sys.executable` inside the selected environment. Do not assume an existing project virtual environment was created from a uv-managed interpreter; if it points to mise Python, ask before rebuilding it. Obtain approval before downloading runtimes or changing version declarations.
- For a new project, choose a supported version compatible with its dependencies and deployment target. Do not silently upgrade an existing project's Python or edit user-level runtime configuration.
- In uv projects, use `uv run` for commands and the existing dependency groups for tests and linting. Respect `uv.lock`; use locked execution when the task must not update dependency resolution. Adding or removing dependencies is a separate, intentional change.
- Use `uv venv` for small isolated environments when a full project is unnecessary. Consider PEP 723 metadata for scripts that actually need third-party packages; do not add scaffolding for a standard-library-only script.
- Prefer `uvx` for one-off Python tools when the project does not already provide them. Explain downloads, network requirements, and persistent effects before introducing tools. Do not install packages into a global interpreter just to run a check.
- Keep a project's existing lock policy. For new uv projects, retain `uv.lock` for reproducible development, including libraries when appropriate; it does not pin a library consumer's dependency resolution.

## Validation Versus Modification

- Prefer Ruff and pytest where the project has no established alternatives.
- For inspection, use non-mutating checks such as `ruff check` and `ruff format --check`, scoped to relevant files.
- Use `ruff check --fix` or `ruff format` only within an authorized edit scope; inspect their diff and preserve unrelated user changes.
- Run the narrowest meaningful pytest selection, then nearby checks when warranted. Do not introduce test-first development solely because Python tests are needed.
- Verify the actual interpreter, environment, and command outcome. A tool found on PATH may be an inactive shim, not a usable executable. For Python command or version failures, compare the project interpreter requirements, active environment, executable path, and actual version before proposing changes. Do not repair a local selection problem by changing global defaults without approval.

## Coding Preferences

Apply these only where repository conventions leave room, and do not reorder working code solely to enforce them:

- Group module documentation and future imports, standard-library and third-party imports, constants, classes, and functions coherently.
- Use clear public names for supported interfaces and a leading underscore for implementation details. Do not mechanically rename every existing symbol.
- Use `__all__` when an explicit export surface helps callers; do not add it to every module or re-export names unnecessarily.
- Prefer `UPPER_CASE` for constants, with a leading underscore for internal constants. Reserve double underscores for intentional name-mangling behavior.
- Arrange definitions for readability while respecting initialization dependencies, decorators, base classes, and default-value evaluation.
- Prefer plain pytest assertions and fixtures where the project uses pytest; preserve useful existing unittest coverage rather than rewriting it for style.
