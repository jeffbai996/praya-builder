"""Agent-facing draft context contract."""
from pathlib import Path
import subprocess


def test_agent_context_contract():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "--test", "preview/check-agent-contract.cjs"],
        cwd=root,
        text=True,
        capture_output=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stdout + result.stderr
