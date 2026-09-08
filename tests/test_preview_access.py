"""Exact host admission for a loopback app behind a private HTTPS proxy."""
import json
from pathlib import Path
import subprocess

import pytest


ROOT = Path(__file__).resolve().parents[1]


def hosts(origin):
    return subprocess.run(
        ["node", "-e", "const {allowedHosts}=require('./preview/access.cjs');"
         "console.log(JSON.stringify([...allowedHosts(8091,process.argv[1])]))", origin],
        cwd=ROOT, capture_output=True, text=True,
    )


def test_default_access_remains_loopback_only():
    result = hosts("")
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout) == ["127.0.0.1:8091", "localhost:8091"]


def test_only_configured_https_authority_is_added():
    result = hosts("https://preview.example.com:8463")
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout) == [
        "127.0.0.1:8091", "localhost:8091", "preview.example.com:8463"]


@pytest.mark.parametrize("origin", [
    "http://preview.example.com:8463", "https://*.example.com",
    "https://user:password@example.com", "https://example.com/preview",
    "https://example.com?foo=bar", "https://example.com#section", "not-a-url",
])
def test_invalid_proxy_origins_fail_closed(origin):
    assert hosts(origin).returncode != 0
