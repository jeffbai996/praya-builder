"""Structured, location-aware design diagnostics."""
from pathlib import Path
import subprocess


def test_diagnostic_rule_fixtures():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "--test", "preview/check-diagnostics.cjs"],
        cwd=root, text=True, capture_output=True, timeout=60,
    )
    assert result.returncode == 0, result.stdout + result.stderr
