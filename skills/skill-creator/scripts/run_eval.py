#!/usr/bin/env python3
"""Evaluate Skill discovery through an explicitly configured agent adapter."""

import argparse
import json
import math
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from scripts.agent_runner import call_runner, runner_command
from scripts.utils import parse_skill_md


def find_project_root() -> Path:
    """Return the user-selected working directory; do not discover agent config."""
    return Path.cwd()


def run_single_query(
    query: str,
    skill_name: str,
    skill_description: str,
    timeout: int,
    project_root: str,
    model: str | None = None,
) -> bool:
    response = call_runner({
        "operation": "trigger",
        "query": query,
        "skill": {"name": skill_name, "description": skill_description},
        "project_root": project_root,
        "model": model,
    }, timeout=timeout)
    if type(response.get("triggered")) is not bool:
        raise ValueError("Trigger adapter must return a boolean triggered field")
    if not isinstance(response.get("evidence"), str) or not response["evidence"].strip():
        raise ValueError("Trigger adapter must return observed invocation evidence")
    return response["triggered"]


def run_eval(
    eval_set: list[dict],
    skill_name: str,
    description: str,
    num_workers: int,
    timeout: int,
    project_root: Path,
    runs_per_query: int = 1,
    trigger_threshold: float = 0.5,
    model: str | None = None,
) -> dict:
    runner_command()
    if not isinstance(eval_set, list) or not eval_set:
        raise ValueError("Evaluation set must be a non-empty list")
    if num_workers < 1 or runs_per_query < 1 or timeout <= 0:
        raise ValueError("Workers, runs per query and timeout must be positive")
    if not math.isfinite(trigger_threshold) or not 0 < trigger_threshold <= 1:
        raise ValueError("Trigger threshold must be greater than zero and at most one")
    for item in eval_set:
        if not isinstance(item, dict) or not isinstance(item.get("query"), str) or not item["query"].strip():
            raise ValueError("Every evaluation needs a non-empty query")
        if type(item.get("should_trigger")) is not bool:
            raise ValueError("Every evaluation needs a boolean should_trigger")
    queries = [item["query"] for item in eval_set]
    if len(set(queries)) != len(queries):
        raise ValueError("Evaluation queries must be unique")

    results = []
    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        jobs = [
            (item, [executor.submit(
                run_single_query, item["query"], skill_name, description,
                timeout, str(project_root), model,
            ) for _ in range(runs_per_query)])
            for item in eval_set
        ]
        for item, futures in jobs:
            # Infrastructure failures abort the evaluation; they must never count
            # as a correct negative trigger or improve the reported score.
            triggers = [future.result() for future in futures]
            rate = sum(triggers) / len(triggers)
            passed = rate >= trigger_threshold if item["should_trigger"] else rate < trigger_threshold
            results.append({
                "query": item["query"], "should_trigger": item["should_trigger"],
                "trigger_rate": rate, "triggers": sum(triggers),
                "runs": len(triggers), "pass": passed,
            })
    passed = sum(result["pass"] for result in results)
    return {
        "skill_name": skill_name, "description": description, "results": results,
        "summary": {"total": len(results), "passed": passed, "failed": len(results) - passed},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--eval-set", required=True)
    parser.add_argument("--skill-path", required=True)
    parser.add_argument("--description")
    parser.add_argument("--num-workers", type=int, default=1)
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument("--runs-per-query", type=int, default=1)
    parser.add_argument("--trigger-threshold", type=float, default=0.5)
    parser.add_argument("--model", help="Optional adapter-specific model; no default override")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    name, description, _ = parse_skill_md(Path(args.skill_path))
    output = run_eval(
        json.loads(Path(args.eval_set).read_text()), name, args.description or description,
        args.num_workers, args.timeout, find_project_root(), args.runs_per_query,
        args.trigger_threshold, args.model,
    )
    if args.verbose:
        print(f"Completed {output['summary']['total']} queries", file=sys.stderr)
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
