"""Bounded command runner and durable blind comparison contracts."""
from pathlib import Path
import subprocess
def test_bakeoff_contract():
    root=Path(__file__).resolve().parents[1]
    result=subprocess.run(["node","--test","preview/check-bakeoff.cjs"],cwd=root,text=True,capture_output=True,timeout=30)
    assert result.returncode==0,result.stdout+result.stderr
