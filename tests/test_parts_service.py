"""Part insertion and scoped palette semantics."""
from pathlib import Path
import subprocess
def test_parts_service_contract():
    root=Path(__file__).resolve().parents[1]
    result=subprocess.run(["node","--test","preview/check-parts-service.cjs"],cwd=root,text=True,capture_output=True,timeout=30)
    assert result.returncode==0,result.stdout+result.stderr
