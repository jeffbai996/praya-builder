"""Browser contract for blind bake-off presentation and reveal."""
from pathlib import Path
import os
import subprocess

import pytest


def test_bakeoff_ui():
    module = os.environ.get("PLAYWRIGHT_MODULE")
    chromium = os.environ.get("CHROMIUM_PATH")
    if not module or not chromium:
        pytest.skip("bake-off browser dependencies are not configured")
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "preview/check-bakeoff-ui.cjs"], cwd=root,
        text=True, capture_output=True, timeout=45,
    )
    assert result.returncode == 0, result.stdout + result.stderr
