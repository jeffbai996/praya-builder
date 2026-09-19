"""Contract tests for the canonical Builder MCP adapter and installer."""
from __future__ import annotations

import asyncio
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import types

import httpx
import pytest


ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "ops" / "mcp" / "tools_builder.py"
INSTALLER = ROOT / "ops" / "mcp" / "install-builder-tools.py"


class FakeMCP:
    def __init__(self):
        self.tools = {}

    def tool(self):
        def decorate(function):
            self.tools[function.__name__] = function
            return function
        return decorate


def load_module():
    fake = FakeMCP()
    app = types.ModuleType("app")
    app.mcp = fake
    prior = sys.modules.get("app")
    sys.modules["app"] = app
    try:
        spec = importlib.util.spec_from_file_location("builder_tools_fixture", MODULE)
        module = importlib.util.module_from_spec(spec)
        assert spec.loader
        spec.loader.exec_module(module)
    finally:
        if prior is None:
            sys.modules.pop("app", None)
        else:
            sys.modules["app"] = prior
    return module, fake


def test_seven_tools_forward_validated_workspace_contracts_and_sheet_links():
    module, fake = load_module()
    assert set(fake.tools) == {
        "builder_context", "builder_site", "builder_post_plan", "builder_edit",
        "builder_review", "builder_save", "builder_sheet",
    }
    artifact1, artifact2 = "1" * 64, "2" * 64
    review1, review2 = "a" * 64, "b" * 64
    requests = []

    def manifest(artifact, review, file):
        return {
            "schemaVersion": 1,
            "artifactHash": artifact,
            "reviewHash": review,
            "diagnosticsSource": "saved-snapshot",
            "views": [{"id": file[:-4], "label": "Fixture", "file": file,
                       "url": f"/api/workspace/artifacts/{artifact}/sheet/{file}?review={review}"}],
        }

    def handler(request):
        body = json.loads(request.content) if request.content else None
        requests.append((request.method, request.url.path, request.url.query.decode(), dict(request.headers), body))
        path = request.url.path.removeprefix("/api/workspace/")
        if path == "context":
            data = {"drafts": [], "sites": [], "revisions": []}
        elif path == "sites/site-1":
            data = {"id": "site-1", "hash": "3" * 64}
        elif path == "drafts" and request.method == "POST":
            data = {"id": "draft-1", "version": 1, "candidate": {"hash": artifact1}}
        elif path == "drafts/draft-1/edit":
            data = {"id": "draft-1", "version": 2, "author": body["author"]}
        elif path == "drafts/draft-1/save":
            data = {"id": "revision-1", "artifactHash": artifact1, "savedBy": body["author"]}
        elif path == "drafts/draft-1/context":
            data = {"draftId": "draft-1", "candidateHash": artifact1,
                    "sheet": {"index": f"/api/workspace/artifacts/{artifact1}/sheet/index.json?review={review1}"}}
        elif path == f"artifacts/{artifact1}/sheet/index.json":
            data = manifest(artifact1, review1, "front.png")
        elif path == "revisions/revision-1/sheet":
            data = manifest(artifact2, review2, "plan-0.png")
        else:
            return httpx.Response(404, json={"error": "fixture route missing"})
        return httpx.Response(200, json=data)

    module._workspace = module.BuilderWorkspace("https://builder.example", transport=httpx.MockTransport(handler))
    author = {"agent": "astra", "model": "gpt-6", "effort": "high"}
    plan = {"schema_version": 1, "plan_id": "fixture", "revision": "r0", "components": []}

    async def exercise():
        assert (await fake.tools["builder_context"]())["drafts"] == []
        assert (await fake.tools["builder_site"]("site-1"))["id"] == "site-1"
        await fake.tools["builder_post_plan"](plan, author, site_id="site-1", transform={"origin": [0, 0, 0], "turns": 0}, brief="Fixture")
        await fake.tools["builder_edit"]("draft-1", 1, author, palette={"wall": "minecraft:stone"}, component_id="Shell_Main")
        assert (await fake.tools["builder_review"]("draft-1"))["candidateHash"] == artifact1
        saved = await fake.tools["builder_save"]("draft-1", 2, artifact1, "save-fixture", author)
        assert saved["savedBy"] == author
        draft_sheet = await fake.tools["builder_sheet"](draft_id="draft-1")
        revision_sheet = await fake.tools["builder_sheet"](revision_id="revision-1")
        return draft_sheet, revision_sheet

    draft_sheet, revision_sheet = asyncio.run(exercise())
    assert draft_sheet["views"][0]["url"] == f"https://builder.example/api/workspace/artifacts/{artifact1}/sheet/front.png?review={review1}"
    assert draft_sheet["indexUrl"].endswith(f"/{artifact1}/sheet/index.json?review={review1}")
    assert revision_sheet["views"][0]["url"].endswith(f"/{artifact2}/sheet/plan-0.png?review={review2}")
    for method, _, _, headers, _ in requests:
        if method == "POST":
            assert headers["x-builder-write"] == "1"
        else:
            assert "x-builder-write" not in headers
    post_bodies = {path: body for method, path, _, _, body in requests if method == "POST"}
    assert post_bodies["/api/workspace/drafts"]["author"] == author
    assert post_bodies["/api/workspace/drafts/draft-1/edit"]["author"] == author
    assert post_bodies["/api/workspace/drafts/draft-1/edit"]["componentId"] == "Shell_Main"
    assert post_bodies["/api/workspace/drafts/draft-1/save"]["author"] == author


def test_ids_authors_and_sheet_identity_are_rejected_before_unsafe_use():
    module, fake = load_module()
    with pytest.raises(ValueError, match="draft_id"):
        asyncio.run(fake.tools["builder_review"]("../../jobs"))
    with pytest.raises(ValueError, match="author is required"):
        asyncio.run(fake.tools["builder_post_plan"]({}, {}))
    with pytest.raises(ValueError, match="positive integer"):
        asyncio.run(fake.tools["builder_edit"]("draft-1", True, {"agent": "fixture"}, palette={"wall": "minecraft:stone"}))
    with pytest.raises(ValueError, match="positive integer"):
        asyncio.run(fake.tools["builder_save"]("draft-1", False, "1" * 64, "save", {"agent": "fixture"}))
    with pytest.raises(ValueError, match="exactly one"):
        asyncio.run(fake.tools["builder_sheet"]())
    with pytest.raises(ValueError, match="exactly one"):
        asyncio.run(fake.tools["builder_sheet"]("draft-1", "revision-1"))

    artifact, review = "1" * 64, "a" * 64
    def hostile(request):
        if request.url.path.endswith("/drafts/draft-1/context"):
            return httpx.Response(200, json={"candidateHash": artifact, "sheet": {"index": f"/api/workspace/artifacts/{artifact}/sheet/index.json?review={review}"}})
        return httpx.Response(200, json={"artifactHash": artifact, "reviewHash": review, "views": [{"file": "front.png", "url": "https://evil.invalid/front.png"}]})
    module._workspace = module.BuilderWorkspace("https://builder.example", transport=httpx.MockTransport(hostile))
    with pytest.raises(RuntimeError, match="unexpected sheet image"):
        asyncio.run(fake.tools["builder_sheet"](draft_id="draft-1"))


def test_installer_is_idempotent_and_does_not_restart(tmp_path):
    target = tmp_path / "mcp"
    target.mkdir()
    (target / "server.py").write_text("from app import mcp\nimport tools_admin  # noqa: F401,E402\n", encoding="utf-8")
    command = [sys.executable, str(INSTALLER), "--target", str(target)]
    first = json.loads(subprocess.run(command, check=True, text=True, capture_output=True).stdout)
    second = json.loads(subprocess.run(command, check=True, text=True, capture_output=True).stdout)
    assert first == {"target": str(target), "module_updated": True, "import_added": True, "service_restarted": False}
    assert second == {"target": str(target), "module_updated": False, "import_added": False, "service_restarted": False}
    assert (target / "tools_builder.py").read_bytes() == MODULE.read_bytes()
    assert (target / "server.py").read_text(encoding="utf-8").count("import tools_builder") == 1


def test_registers_with_real_fastmcp_when_host_runtime_is_requested():
    python = os.environ.get("PRAYA_MCP_PYTHON")
    host = os.environ.get("PRAYA_MCP_HOST_DIR")
    if not python or not host:
        pytest.skip("real Praya MCP runtime is not configured")
    code = "import tools_builder; from app import mcp; print(','.join(sorted(t.name for t in mcp._tool_manager.list_tools())))"
    env = {**os.environ, "PYTHONPATH": os.pathsep.join([str(MODULE.parent), host])}
    result = subprocess.run([python, "-c", code], check=True, text=True, capture_output=True, env=env)
    assert result.stdout.strip().split(",") == [
        "builder_context", "builder_edit", "builder_post_plan", "builder_review",
        "builder_save", "builder_sheet", "builder_site",
    ]
