"""Irregular revisions must change occupied mass, not only decorate a roof."""
import json
import subprocess
from collections import deque
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
R0_HASHES = {
    "clinic": "cb1e3add90641622941c64d927bcd0b8a3cdf82a9a3468b48598e26c7148670d",
    "market": "951781d286adbb26976baabec4fb09c4fbc777cbeb8470f6bcf9beee7e53261a",
    "school": "9c39a0d6f7640be17bdfd97bfc4c1e7e9ea3cb3baba785ebe9e854204155e37f",
}


def compile_design(run_probe, project, revision):
    plan = subprocess.run(["node", "-e",
        "console.log(JSON.stringify(require('./preview/catalog.cjs').createPlan(process.argv[1],process.argv[2])))",
        project, revision], cwd=ROOT, capture_output=True, text=True, check=True)
    result = run_probe("org.govpraya.builder.plan.PlanProbe", plan.stdout)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)


@pytest.mark.parametrize("project", R0_HASHES)
def test_original_service_design_is_immutable(project, run_probe):
    assert compile_design(run_probe, project, "r0")["hash"] == R0_HASHES[project]


@pytest.fixture(scope="module", params=list(R0_HASHES))
def irregular(request, run_probe):
    return request.param, compile_design(run_probe, request.param, "r1")


def test_irregular_revision_has_a_non_rectangular_roof_and_open_court(irregular):
    project, artifact = irregular
    assert artifact["revision"] == "r1"
    assert len(artifact["blocks"]) <= 10000
    roof_y = {"clinic": 8, "market": 7, "school": 13}[project]
    roof = {(b["x"], b["z"]) for b in artifact["blocks"]
            if b["component"] == "envelope" and b["y"] == roof_y and b["block"] != "minecraft:air"}
    xs, zs = zip(*roof)
    assert len(roof) < (max(xs) - min(xs) + 1) * (max(zs) - min(zs) + 1) * .9
    court = {"clinic": (7, 11), "market": (5, 10), "school": (16, 15)}[project]
    assert not [b for b in artifact["blocks"] if (b["x"], b["z"]) == court
                and b["y"] >= 5 and b["block"] != "minecraft:air"]


def test_irregular_revision_rooms_remain_reachable(irregular):
    project, artifact = irregular
    cells = {(b["x"], b["y"], b["z"]): b["block"] for b in artifact["blocks"]}
    def empty(p):
        return cells.get(p, "minecraft:air") == "minecraft:air"
    def walkable(p):
        x, y, z = p
        return (0 <= x < 32 and 1 <= y < 23 and 0 <= z < 32
                and empty(p) and empty((x, y + 1, z)) and not empty((x, y - 1, z)))
    seen, queue = {(16, 1, 1)}, deque([(16, 1, 1)])
    while queue:
        x, y, z = queue.popleft()
        for dx, dz in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            for dy in [-1, 0, 1]:
                p = (x + dx, y + dy, z + dz)
                if p not in seen and walkable(p):
                    seen.add(p)
                    queue.append(p)
    targets = {
        "clinic": [(16, 2, 12), (10, 2, 19), (10, 2, 25), (21, 2, 19), (26, 2, 25)],
        "market": [(16, 2, 12), (11, 2, 17), (17, 2, 17), (23, 2, 17), (25, 2, 26)],
        "school": [(10, 2, 17), (22, 2, 17), (10, 8, 17), (22, 8, 17), (10, 2, 26), (22, 2, 26)],
    }[project]
    assert set(targets) <= seen, f"Unreachable: {set(targets) - seen}"


def test_irregular_revision_renders_with_existing_block_models(irregular):
    _, artifact = irregular
    result = subprocess.run(["node", "-e",
        "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{"
        "const m=require('./preview/mesh.cjs').meshArtifact(JSON.parse(s),24);"
        "console.log(m.sections.reduce((n,p)=>n+p.positions.length,0));});"],
        cwd=ROOT, input=json.dumps(artifact), text=True, capture_output=True, check=True)
    assert int(result.stdout) > 0


def test_postmodern_apartment_has_six_furnished_levels_and_connected_stairs(run_probe):
    artifact = compile_design(run_probe, "postmodern", "r0")
    assert artifact["dimensions"] == {"x": 32, "y": 32, "z": 32}
    assert 5000 < len(artifact["blocks"]) <= 10000
    ids = {c["id"] for c in artifact["components"]}
    assert {f"homes-{i}" for i in range(1, 7)} <= ids
    assert {"stairs", "crown", "terraces"} <= ids
    cells = {(b["x"], b["y"], b["z"]): b["block"] for b in artifact["blocks"]}
    def empty(p):
        return cells.get(p, "minecraft:air") == "minecraft:air"
    seen, queue = {(16, 1, 1)}, deque([(16, 1, 1)])
    while queue:
        x, y, z = queue.popleft()
        for dx, dz in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            for dy in [-1, 0, 1]:
                p = (x + dx, y + dy, z + dz)
                px, py, pz = p
                if (p not in seen and 0 <= px < 32 and 1 <= py < 31 and 0 <= pz < 32
                        and empty(p) and empty((px, py + 1, pz)) and not empty((px, py - 1, pz))):
                    seen.add(p);queue.append(p)
    for y in [2, 6, 10, 14, 18, 22]:
        assert (18, y, 19) in seen, f"Unreachable level at y={y}"
    for y in [2, 6, 10, 14, 18]:
        assert (12, y, 18) in seen and (20, y, 18) in seen
