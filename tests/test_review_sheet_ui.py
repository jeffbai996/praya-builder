"""Browser contract for review-sheet tab and gallery behavior."""
from pathlib import Path
import os
import subprocess

import pytest


def test_review_sheet_ui():
    module = os.environ.get("PLAYWRIGHT_MODULE")
    chromium = os.environ.get("CHROMIUM_PATH")
    if not module or not chromium:
        pytest.skip("review-sheet browser dependencies are not configured")
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "preview/check-review-sheet-ui.cjs"],
        cwd=root, text=True, capture_output=True, timeout=45,
    )
    assert result.returncode == 0, result.stdout + result.stderr
