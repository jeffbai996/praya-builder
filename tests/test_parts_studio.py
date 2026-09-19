"""Opt-in real Studio architectural-part insertion against an isolated scratch workspace."""
from pathlib import Path
import os
import subprocess

import pytest


def test_parts_studio_integration():
    if os.environ.get("BUILDER_PARTS_STUDIO_WRITE") != "1":
        pytest.skip("scratch Studio write check is not enabled")
    module = os.environ.get("PLAYWRIGHT_MODULE")
    chromium = os.environ.get("CHROMIUM_PATH")
    if not module or not chromium:
        pytest.fail("browser dependencies are required when the scratch write check is enabled")
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "preview/check-parts-studio.cjs"], cwd=root,
        text=True, capture_output=True, timeout=90,
    )
    assert result.returncode == 0, result.stdout + result.stderr
