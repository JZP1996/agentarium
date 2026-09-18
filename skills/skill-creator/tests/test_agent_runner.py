"""Contract tests using local fake adapters; no real agent or model calls."""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.agent_runner import call_runner, runner_command
from scripts.improve_description import _call_agent
from scripts.run_eval import run_eval, run_single_query
from scripts.run_loop import split_eval_set


@pytest.fixture
def adapter(tmp_path, monkeypatch):
    def configure(body):
        script = tmp_path / "adapter with spaces.py"
        script.write_text(body, encoding="utf-8")
        monkeypatch.setenv("SKILL_CREATOR_RUNNER", json.dumps([sys.executable, str(script)]))
        return script
    return configure


def test_no_implicit_backend(monkeypatch):
    monkeypatch.delenv("SKILL_CREATOR_RUNNER", raising=False)
    with pytest.raises(RuntimeError, match="requires SKILL_CREATOR_RUNNER"):
        call_runner({"operation": "trigger"})


@pytest.mark.parametrize("value", ['"shell command"', '[]', '[1]', '[""]', 'not json'])
def test_invalid_command_rejected(monkeypatch, value):
    monkeypatch.setenv("SKILL_CREATOR_RUNNER", value)
    with pytest.raises(ValueError):
        runner_command()


def test_adapter_gets_context_but_no_live_registration(adapter, tmp_path):
    adapter('''import json, os, sys
request = json.load(sys.stdin)
assert request["version"] == 1
assert request["model"] is None
assert os.getcwd() != request["project_root"]
assert request["skill"]["description"] == "Review changes"
print(json.dumps({"triggered": True, "evidence": "fixture invocation observed"}))
''')
    assert run_single_query("review", "review", "Review changes", 5, str(tmp_path)) is True
    assert not (tmp_path / ".claude").exists()
    assert not (tmp_path / ".codex").exists()


@pytest.mark.parametrize("response", [
    "not json", "[]", '{"triggered":"false","evidence":"run"}',
    '{"triggered":false}', '{"triggered":true,"evidence":""}', '{"error":"failure"}',
])
def test_invalid_response_is_not_negative_success(adapter, tmp_path, response):
    adapter(f"print({response!r})")
    with pytest.raises(ValueError):
        run_eval([{"query": "no trigger", "should_trigger": False}], "example", "Description", 1, 5, tmp_path)


def test_nonzero_does_not_leak_output_or_pass_negative_case(adapter, tmp_path):
    adapter('import sys; print("sensitive-output", file=sys.stderr); sys.exit(7)')
    with pytest.raises(RuntimeError, match="exit code 7") as error:
        run_eval([{"query": "negative", "should_trigger": False}], "example", "Description", 1, 5, tmp_path)
    assert "sensitive-output" not in str(error.value)


def test_timeout_is_error(adapter, tmp_path):
    adapter('import time; time.sleep(3)')
    with pytest.raises(RuntimeError, match="timed out"):
        run_single_query("q", "example", "Description", 0.1, str(tmp_path))


def test_observed_positive_and_negative_results(adapter, tmp_path):
    adapter('''import json, sys
r = json.load(sys.stdin)
print(json.dumps({"triggered": r["query"] == "positive", "evidence": "completed fixture trace"}))
''')
    result = run_eval([
        {"query": "positive", "should_trigger": True},
        {"query": "negative", "should_trigger": False},
    ], "example", "Description", 1, 5, tmp_path, runs_per_query=2)
    assert result["summary"] == {"total": 2, "passed": 2, "failed": 0}
    assert [entry["triggers"] for entry in result["results"]] == [2, 0]


def test_generation_uses_same_explicit_adapter(adapter):
    adapter('''import json, sys
r = json.load(sys.stdin)
assert r["operation"] == "generate"
assert r["model"] == "chosen-model"
print(json.dumps({"text": "A proposed description"}))
''')
    assert _call_agent("prompt", "chosen-model") == "A proposed description"


def test_generation_rejects_empty_text(adapter):
    adapter('print(\'{"text":""}\')')
    with pytest.raises(ValueError, match="non-empty"):
        _call_agent("prompt", None)


def test_duplicate_queries_rejected(adapter, tmp_path):
    adapter('raise RuntimeError("must not run")')
    with pytest.raises(ValueError, match="unique"):
        run_eval([{"query": "same", "should_trigger": True}] * 2, "example", "Description", 1, 5, tmp_path)


def test_small_holdout_preserves_training_examples():
    rows = [{"query": "yes", "should_trigger": True}, {"query": "no", "should_trigger": False}]
    training, held_out = split_eval_set(rows, 0.4)
    assert len(training) == 2
    assert held_out == []


def test_loop_runs_both_operations_without_editing_skill(adapter, tmp_path):
    from scripts.run_loop import run_loop

    adapter('''import json, sys
r = json.load(sys.stdin)
if r["operation"] == "generate":
    print(json.dumps({"text": "<new_description>Improved description</new_description>"}))
else:
    selected = r["skill"]["description"] == "Improved description"
    print(json.dumps({"triggered": selected, "evidence": "fixture trace"}))
''')
    skill = tmp_path / "skill"
    skill.mkdir()
    content = "---\nname: example\ndescription: Original description\n---\nBody\n"
    (skill / "SKILL.md").write_text(content)
    result = run_loop(
        [{"query": "positive", "should_trigger": True}], skill, None,
        1, 5, 2, 1, 0.5, 0, None, False,
    )
    assert result["iterations_run"] == 2
    assert result["best_description"] == "Improved description"
    assert result["best_train_score"] == "1/1"
    assert (skill / "SKILL.md").read_text() == content
