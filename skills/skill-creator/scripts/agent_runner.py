"""Explicit JSON-over-stdio contract for a user-configured agent adapter."""

import json
import os
import subprocess
import tempfile
from pathlib import Path


def runner_command() -> list[str]:
    raw = os.environ.get("SKILL_CREATOR_RUNNER")
    if not raw:
        raise RuntimeError(
            "Automatic evaluation requires SKILL_CREATOR_RUNNER as a JSON argv array. "
            "Configure an authorized adapter or use manual evaluation; no agent is selected automatically."
        )
    try:
        command = json.loads(raw)
    except json.JSONDecodeError as error:
        raise ValueError("SKILL_CREATOR_RUNNER must be a JSON argv array") from error
    if not isinstance(command, list) or not command or not all(
        isinstance(arg, str) and arg and "\0" not in arg for arg in command
    ):
        raise ValueError("SKILL_CREATOR_RUNNER must contain non-empty string arguments")
    return command


def call_runner(request: dict, timeout: int = 300) -> dict:
    """Run only the configured adapter, without a shell or project config writes.

    The temporary working directory is isolation for artifacts, not a security
    sandbox. The adapter must enforce its own authorized access and permissions.
    """
    command = runner_command()
    if timeout <= 0:
        raise ValueError("Runner timeout must be positive")
    with tempfile.TemporaryDirectory(prefix="skill-creator-run-") as directory:
        try:
            result = subprocess.run(
                command,
                input=json.dumps({"version": 1, **request}),
                capture_output=True,
                text=True,
                encoding="utf-8",
                cwd=Path(directory),
                timeout=timeout,
                check=False,
            )
        except subprocess.TimeoutExpired as error:
            raise RuntimeError("Agent adapter timed out; no evaluation result is available") from error
        except OSError as error:
            raise RuntimeError("Could not start the configured agent adapter") from error
    if result.returncode != 0:
        # Do not echo arbitrary adapter output that may contain credentials.
        raise RuntimeError(f"Agent adapter failed with exit code {result.returncode}")
    try:
        response = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise ValueError("Agent adapter must return one JSON object on stdout") from error
    if not isinstance(response, dict) or response.get("error"):
        raise ValueError("Agent adapter returned an error or invalid response")
    return response
