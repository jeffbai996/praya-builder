import os
import pathlib
import subprocess


ROOT = pathlib.Path(__file__).resolve().parents[1]


def test_part_library_contract():
    env = os.environ.copy()
    env.setdefault("JAVA_HOME", str(ROOT / "preview" / ".workspace" / "java21"))
    subprocess.run(
        ["node", "--test", "preview/check-parts.cjs"],
        cwd=ROOT,
        env=env,
        check=True,
    )
