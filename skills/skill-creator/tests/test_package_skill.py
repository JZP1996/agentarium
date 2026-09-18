"""Validate package boundaries using isolated files; no model or network calls."""

import sys
import zipfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.package_skill import package_skill


def skill(tmp_path):
    directory = tmp_path / "sample"
    directory.mkdir()
    (directory / "SKILL.md").write_text("---\nname: sample\ndescription: A test skill\n---\nContent\n")
    (directory / "LICENSE.txt").write_text("Package license\n")
    return directory


def test_excludes_private_state_caches_and_archives(tmp_path):
    directory = skill(tmp_path)
    excluded = [".env", ".env.local", ".git/config", ".pytest_cache/state", ".venv/bin/python",
                ".ruff_cache/state", "old.skill", "cache.pyc", "private.pem", "nested/id_rsa"]
    for name in excluded:
        path = directory / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("must not be packaged")
    (directory / "guide.md").write_text("Usage")
    archive = package_skill(directory, tmp_path / "output")
    assert archive is not None
    with zipfile.ZipFile(archive) as result:
        assert set(result.namelist()) == {"sample/SKILL.md", "sample/LICENSE.txt", "sample/guide.md"}


def test_rejects_output_inside_source(tmp_path):
    directory = skill(tmp_path)
    output = directory / "dist"
    assert package_skill(directory, output) is None
    assert not output.exists()


def test_preserves_existing_archive(tmp_path):
    directory = skill(tmp_path)
    output = tmp_path / "output"
    output.mkdir()
    archive = output / "sample.skill"
    archive.write_bytes(b"user archive")
    assert package_skill(directory, output) is None
    assert archive.read_bytes() == b"user archive"


@pytest.mark.parametrize("link_to_directory", [False, True])
def test_rejects_nonexcluded_symlinks(tmp_path, link_to_directory):
    directory = skill(tmp_path)
    external = tmp_path / "outside"
    if link_to_directory:
        external.mkdir()
        (external / "file").write_text("outside")
    else:
        external.write_text("outside")
    try:
        (directory / "linked").symlink_to(external, target_is_directory=link_to_directory)
    except OSError:
        pytest.skip("Symlinks unavailable on this platform")
    assert package_skill(directory, tmp_path / "output") is None
    assert not (tmp_path / "output/sample.skill").exists()


def test_rejects_symlinked_skill_root(tmp_path):
    directory = skill(tmp_path)
    link = tmp_path / "linked-root"
    try:
        link.symlink_to(directory, target_is_directory=True)
    except OSError:
        pytest.skip("Symlinks unavailable on this platform")
    assert package_skill(link, tmp_path / "output") is None


def test_packaging_failure_removes_only_its_partial_output(tmp_path, monkeypatch):
    directory = skill(tmp_path)
    output = tmp_path / "output"
    output.mkdir()
    foreign = output / "other.skill"
    foreign.write_bytes(b"keep")

    def fail(*args, **kwargs):
        raise OSError("simulated write failure")

    monkeypatch.setattr(zipfile.ZipFile, "write", fail)
    assert package_skill(directory, output) is None
    assert not (output / "sample.skill").exists()
    assert foreign.read_bytes() == b"keep"


def test_does_not_package_root_evaluations_but_keeps_referenced_nested_resources(tmp_path):
    directory = skill(tmp_path)
    (directory / "evals").mkdir()
    (directory / "evals/evals.json").write_text("[]")
    (directory / "assets/evals").mkdir(parents=True)
    (directory / "assets/evals/example.json").write_text("{}")
    archive = package_skill(directory, tmp_path / "output")
    with zipfile.ZipFile(archive) as result:
        assert "sample/evals/evals.json" not in result.namelist()
        assert "sample/assets/evals/example.json" in result.namelist()
