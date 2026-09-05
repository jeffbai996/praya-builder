"""Run JVM regression probes through pytest using the project's Gradle classpath."""

import os
from pathlib import Path
import subprocess

import pytest


@pytest.fixture(scope="session")
def run_probe():
    root = Path(__file__).resolve().parents[1]
    subprocess.run(
        ["bash", "gradlew", "--no-daemon", "-q", "prepareRegressionTests"],
        cwd=root, check=True, timeout=300,
    )
    classpath = (root / "build/regression-classpath.txt").read_text().strip()
    java_home = os.environ.get("JAVA_HOME")
    java = str(Path(java_home) / "bin/java") if java_home else "java"

    def run(class_name: str, *args: str):
        return subprocess.run(
            [java, "-cp", classpath, class_name, *args],
            cwd=root, text=True, capture_output=True, timeout=20,
        )

    return run
