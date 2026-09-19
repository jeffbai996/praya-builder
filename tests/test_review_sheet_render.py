"""Browser-side review-sheet rendering contract."""
from pathlib import Path
import os
import subprocess

import pytest


def test_review_sheet_renderer():
    module = os.environ.get("PLAYWRIGHT_MODULE")
    chromium = os.environ.get("CHROMIUM_PATH")
    if not module or not chromium:
        pytest.skip("review-sheet browser dependencies are not configured")
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "preview/check-review-sheet-render.cjs"],
        cwd=root, text=True, capture_output=True, timeout=90,
    )
    assert result.returncode == 0, result.stdout + result.stderr
