"""Behavior contracts for the site-aware authoring service."""
from pathlib import Path
import subprocess


def test_site_and_draft_contracts():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(["node", "--test", "preview/check-design-service.cjs", "preview/check-construction.cjs", "preview/check-map-integration.cjs", "preview/check-next-run.cjs", "preview/check-capture.cjs"],
                            cwd=root, text=True, capture_output=True, timeout=60)
    assert result.returncode == 0, result.stdout + result.stderr


def test_three_studies_on_flat_and_sloping_sites(run_probe):
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(["node", "--test", "preview/check-apartment-studies.cjs"],
                            cwd=root, text=True, capture_output=True, timeout=60)
    assert result.returncode == 0, result.stdout + result.stderr
