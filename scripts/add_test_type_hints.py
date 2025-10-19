#!/usr/bin/env python3
"""
Bulk add type hints to test files based on CodeRabbit review feedback.

This script automatically adds:
- -> None return type hints to test functions
- client: TestClient parameter hints
- monkeypatch: pytest.MonkeyPatch parameter hints
- execution_log: list[str] variable hints
- Trailing commas in multi-line dicts
"""

import re
from pathlib import Path


def add_test_client_hint(content: str) -> str:
    """Add TestClient type hint to client parameter."""
    # Pattern: def test_...(self, client):
    pattern = r"(def test_\w+\(self, client)(,\s*\w+)?\):"

    def replace_fn(match: re.Match[str]) -> str:
        func_start = match.group(1)
        remaining_params = match.group(2) or ""
        return f"{func_start}: TestClient{remaining_params}) -> None:"

    return re.sub(pattern, replace_fn, content)


def add_monkeypatch_hint(content: str) -> str:
    """Add pytest.MonkeyPatch type hint to monkeypatch parameter."""
    # Pattern: def test_...(self, client, monkeypatch):
    pattern = r"(def test_\w+\([^)]*client: TestClient, )(monkeypatch)\):"
    replacement = r"\1monkeypatch: pytest.MonkeyPatch) -> None:"
    return re.sub(pattern, replacement, content)


def add_async_test_hint(content: str) -> str:
    """Add -> None hint to async test functions."""
    # Pattern: async def test_...():
    pattern = r"(async def test_\w+\([^)]*)\):"

    def replace_fn(match: re.Match) -> str:
        func_sig = match.group(1)
        if " -> " not in func_sig:
            return f"{func_sig}) -> None:"
        return match.group(0)

    return re.sub(pattern, replace_fn, content)


def add_execution_log_hint(content: str) -> str:
    """Add list[str] hint to execution_log variables."""
    pattern = r"(\s+)(execution_log)\s*=\s*\[\]"
    replacement = r"\1\2: list[str] = []"
    return re.sub(pattern, replacement, content)


def add_trailing_commas(content: str) -> str:
    """Add trailing commas to multi-line JSON dicts in test files."""
    # Pattern: "key": "value"\n    }
    pattern = r'("(?:role|streaming)":\s*"?\w+"?)\n(\s+}\)'
    replacement = r'\1,\n\2'
    return re.sub(pattern, replacement, content)


def ensure_imports(content: str, filepath: Path) -> str:
    """Ensure necessary imports are present."""
    lines = content.split("\n")

    needs_testclient = "TestClient" in content and "from fastapi.testclient import TestClient" not in content
    needs_pytest = "pytest.MonkeyPatch" in content and "import pytest" not in content

    # Find import section (after docstring, before first function/class)
    import_idx = 0
    for i, line in enumerate(lines):
        if line.startswith("import ") or line.startswith("from "):
            import_idx = i

    # Add imports after existing imports
    if needs_testclient:
        lines.insert(import_idx + 1, "from fastapi.testclient import TestClient")
    if needs_pytest and "pytest" not in [l.split()[1] for l in lines if l.startswith("import ")]:
        lines.insert(import_idx + 1, "import pytest")

    return "\n".join(lines)


def process_file(filepath: Path) -> tuple[bool, str]:
    """
    Process a single test file.

    Returns:
        (changed, message) tuple
    """
    try:
        content = filepath.read_text()
        original = content

        # Apply all transformations
        content = add_test_client_hint(content)
        content = add_monkeypatch_hint(content)
        content = add_async_test_hint(content)
        content = add_execution_log_hint(content)
        content = add_trailing_commas(content)
        content = ensure_imports(content, filepath)

        if content != original:
            filepath.write_text(content)
            return True, f"✅ Updated {filepath.name}"
        else:
            return False, f"⏭️  Skipped {filepath.name} (no changes needed)"

    except Exception as e:
        return False, f"❌ Error processing {filepath.name}: {e}"


def main() -> None:
    """Process all test files."""
    project_root = Path(__file__).parent.parent

    test_files = [
        project_root / "tests/test_register_task_fix.py",
        project_root / "tests/integration/test_adk_run_sse_passthrough.py",
    ]

    print("🔧 Adding type hints to test files...\n")

    changed_count = 0
    for filepath in test_files:
        if filepath.exists():
            changed, message = process_file(filepath)
            print(message)
            if changed:
                changed_count += 1
        else:
            print(f"⚠️  File not found: {filepath}")

    print(f"\n✅ Complete! Updated {changed_count} file(s).")


if __name__ == "__main__":
    main()
