# Development Environment

- Prefer mise for non-Python development runtimes and CLI tools when suitable. Node.js is already managed this way on the inspected machine; verify actual selections on each machine instead of assuming the same installation state.
- Preserve project version requirements and existing working tooling. Do not migrate a project or add a second version manager without a request.
- Before installing, check whether the tool is absent or merely not selected. A mise shim on PATH does not prove the command works.
- If mise support, installation method, version, or project/global scope is unclear, present the options and ask the user. Do not silently choose another manager.
- A preference for mise is not approval for upgrades, global configuration edits, manager migrations, or removals. Confirm effects outside the user's request.
- Verify the actual executable and version after an authorized change; installer success alone does not establish readiness.
