"""The department catalogue must identify reproducible, distinct proposals."""
import json
import subprocess
from collections import deque
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="module")
def catalog():
    result = subprocess.run(["node", "-e",
        "console.log(JSON.stringify(require('./preview/catalog.cjs').projects))"],
        cwd=ROOT, text=True, capture_output=True, check=True)
    return json.loads(result.stdout)


def test_catalog_contains_nine_distinct_projects(catalog):
    assert {p["id"] for p in catalog} == {"courtyard", "terrace", "library", "clinic", "market", "school", "postmodern", "braemar", "mansion"}
    assert len({p["caseId"] for p in catalog}) == 9
    assert len({p["planId"] for p in catalog}) == 9
    for project in catalog:
        assert project["latest"] in [r["id"] for r in project["revisions"]]
        assert project["site"] == "Synthetic site · location unassigned"


@pytest.mark.parametrize("project_id", ["terrace", "library", "clinic", "market", "school"])
def test_additional_designs_compile_and_mesh(project_id, run_probe):
    result = subprocess.run(["node", "-e",
        "console.log(JSON.stringify(require('./preview/catalog.cjs').createPlan(process.argv[1],'r0')))",
        project_id], cwd=ROOT, text=True, capture_output=True, check=True)
    compiled = run_probe("org.govpraya.builder.plan.PlanProbe", result.stdout)
    assert compiled.returncode == 0, compiled.stderr
    artifact = json.loads(compiled.stdout)
    assert 1000 < len(artifact["blocks"]) <= 10000
    assert artifact["dimensions"] == {"x": 32, "y": 24, "z": 32}
    assert len(artifact["spaces"]) >= 2
    assert len(artifact["components"]) >= 4
    if (ROOT / "preview/node_modules/prismarine-viewer").exists():
        mesh = subprocess.run(["node", "-e",
            "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{"
            "const m=require('./preview/mesh.cjs').meshArtifact(JSON.parse(s),24);"
            "console.log(m.sections.reduce((n,p)=>n+p.positions.length,0));});"],
            cwd=ROOT, input=compiled.stdout, text=True, capture_output=True, check=True)
        assert int(mesh.stdout) > 0


def test_unknown_project_and_revision_are_rejected():
    for project, revision in [("unknown", "r0"), ("library", "r99")]:
        result = subprocess.run(["node", "-e",
            "require('./preview/catalog.cjs').createPlan(process.argv[1],process.argv[2])",
            project, revision], cwd=ROOT, text=True, capture_output=True)
        assert result.returncode != 0


@pytest.mark.parametrize("project_id", ["terrace", "library", "clinic", "market", "school"])
def test_new_design_entrances_reach_main_spaces(project_id, run_probe):
    result = subprocess.run(["node", "-e",
        "console.log(JSON.stringify(require('./preview/catalog.cjs').createPlan(process.argv[1],'r0')))",
        project_id], cwd=ROOT, text=True, capture_output=True, check=True)
    compiled = run_probe("org.govpraya.builder.plan.PlanProbe", result.stdout)
    assert compiled.returncode == 0, compiled.stderr
    cells = {(b["x"], b["y"], b["z"]): b["block"] for b in json.loads(compiled.stdout)["blocks"]}

    def empty(p):
        return cells.get(p, "minecraft:air") == "minecraft:air"

    def walkable(p):
        x, y, z = p
        return (0 <= x < 32 and 1 <= y < 24 and 0 <= z < 32
                and empty(p) and empty((x, y + 1, z)) and not empty((x, y - 1, z)))

    start = (16, 1, 1)
    seen, queue = {start}, deque([start])
    while queue:
        x, y, z = queue.popleft()
        for dx, dz in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            for dy in [-1, 0, 1]:
                p = (x + dx, y + dy, z + dz)
                if p not in seen and walkable(p):
                    seen.add(p)
                    queue.append(p)
    targets = ([(x + 6, 2, 13) for x in [4, 18]]
               + [(x + 8, 7, 22) for x in [4, 18]]
               + [(x + 6, 7, 7) for x in [4, 18]]) if project_id == "terrace" else [
                   (16, 2, 20), (8, 2, 18), (21, 2, 20)]
    targets = {
        "clinic": [(16, 2, 12), (10, 2, 19), (10, 2, 25), (21, 2, 19), (21, 2, 25), (26, 2, 25)],
        "market": [(16, 2, 12), (11, 2, 17), (17, 2, 17), (23, 2, 17), (25, 2, 25)],
        "school": [(16, 2, 16), (10, 2, 17), (22, 2, 17), (10, 8, 17), (22, 8, 17), (10, 2, 26), (22, 2, 26)],
    }.get(project_id, targets)
    assert set(targets) <= seen, f"Unreachable spaces: {set(targets) - seen}"


@pytest.mark.parametrize("project_id,required", [
    ("clinic", {"reception", "exam-rooms", "treatment", "staff-washrooms", "roof-services", "landscape"}),
    ("market", {"entry-gates", "retail-shelves", "chilled-food", "coffee-counter", "stockroom", "roof-services"}),
    ("school", {"classroom-1", "classroom-2", "classroom-3", "classroom-4", "admin", "canteen", "stairs", "play-yard"}),
])
def test_detailed_buildings_have_distinct_programmes(project_id, required):
    result = subprocess.run(["node", "-e",
        "console.log(JSON.stringify(require('./preview/catalog.cjs').createPlan(process.argv[1],'r0')))",
        project_id], cwd=ROOT, text=True, capture_output=True, check=True)
    plan = json.loads(result.stdout)
    assert required <= {c["id"] for c in plan["components"]}
    assert len(plan["spaces"]) >= 6
    assert len(plan["palette"]) >= 24
