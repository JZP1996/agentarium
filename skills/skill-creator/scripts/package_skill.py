#!/usr/bin/env python3
"""Create a .skill archive without private state, links, or output overwrite.

Run from the skill-creator directory:
    python -m scripts.package_skill <skill-directory> [output-directory]
"""

import fnmatch
import sys
import zipfile
from pathlib import Path

from scripts.quick_validate import validate_skill

_EXCLUDE_DIRS = {
    ".git", ".hg", ".svn", ".venv", "venv", "__pycache__", "node_modules",
    ".pytest_cache", ".ruff_cache", ".mypy_cache", ".tox", ".nox", ".ssh", ".aws",
}
_EXCLUDE_GLOBS = {".env*", "*.pyc", "*.skill", "*.pem", "*.key", "*.p12", "*.pfx"}
_EXCLUDE_FILES = {".DS_Store", ".npmrc", ".netrc", ".pypirc", "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519"}
_ROOT_EXCLUDE_DIRS = {"evals"}


def should_exclude(rel_path: Path) -> bool:
    """Paths include the Skill folder as their first component."""
    parts = rel_path.parts[1:]
    if any(part in _EXCLUDE_DIRS for part in parts):
        return True
    if parts and parts[0] in _ROOT_EXCLUDE_DIRS:
        return True
    return any(
        part in _EXCLUDE_FILES or any(fnmatch.fnmatch(part, pattern) for pattern in _EXCLUDE_GLOBS)
        for part in parts
    )


def _collect_files(directory: Path, root: Path) -> list[Path]:
    files = []
    for candidate in sorted(directory.iterdir()):
        relative = candidate.relative_to(root.parent)
        if should_exclude(relative):
            continue
        if candidate.is_symlink():
            raise ValueError(f"Symbolic links are not supported: {relative}")
        if candidate.is_dir():
            files.extend(_collect_files(candidate, root))
        elif candidate.is_file():
            files.append(candidate)
        else:
            raise ValueError(f"Unsupported file type: {relative}")
    return files


def package_skill(skill_path, output_dir=None):
    """Return the new archive path, or None without replacing existing output."""
    created = False
    archive_path = None
    try:
        original = Path(skill_path).expanduser()
        if original.is_symlink():
            raise ValueError("The Skill root must not be a symbolic link")
        root = original.resolve()
        if not root.is_dir():
            raise ValueError("Skill directory does not exist")
        output = Path(output_dir).expanduser().resolve() if output_dir else Path.cwd().resolve()
        if output == root or root in output.parents:
            raise ValueError("Output directory must be outside the Skill directory")
        # Inspect files before validation so SKILL.md itself cannot redirect the reader.
        files = _collect_files(root, root)
        valid, message = validate_skill(root)
        if not valid:
            raise ValueError(message)
        archive_path = output / f"{root.name}.skill"
        output.mkdir(parents=True, exist_ok=True)
        # Exclusive creation also rejects existing or dangling output symlinks.
        with archive_path.open("xb") as stream:
            created = True
            with zipfile.ZipFile(stream, "w", zipfile.ZIP_DEFLATED) as archive:
                for file_path in files:
                    if file_path.is_symlink() or not file_path.is_file():
                        raise ValueError("Source changed during packaging; retry from a stable snapshot")
                    archive.write(file_path, file_path.relative_to(root.parent))
        print(f"Packaged Skill: {archive_path}")
        return archive_path
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        if created and archive_path is not None:
            archive_path.unlink(missing_ok=True)
        print(f"Error: {error}", file=sys.stderr)
        return None


def main():
    if len(sys.argv) not in (2, 3):
        print("Usage: python -m scripts.package_skill <skill-directory> [output-directory]", file=sys.stderr)
        return 1
    return 0 if package_skill(sys.argv[1], sys.argv[2] if len(sys.argv) == 3 else None) else 1


if __name__ == "__main__":
    sys.exit(main())
