"""Browser contract for architectural-part insertion controls."""
from pathlib import Path
import os
import subprocess

import pytest


def test_parts_ui():
    module = os.environ.get("PLAYWRIGHT_MODULE")
    chromium = os.environ.get("CHROMIUM_PATH")
    if not module or not chromium:
        pytest.skip("parts browser dependencies are not configured")
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "preview/check-parts-ui.cjs"], cwd=root,
        text=True, capture_output=True, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
