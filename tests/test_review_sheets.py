"""Review-sheet cache and context contracts."""
from pathlib import Path
import subprocess


def test_review_sheet_contract():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "--test", "preview/check-review-sheets.cjs"],
        cwd=root,
        text=True,
        capture_output=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stdout + result.stderr
