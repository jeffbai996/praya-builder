"""Reference-led medical centre: distinct massing and usable clinical floors."""
import json
import subprocess
from collections import deque

import pytest

from test_irregular_designs import compile_design, ROOT


@pytest.fixture(scope="module")
def clinic(run_probe):
    return compile_design(run_probe, "braemar", "r0")


@pytest.mark.parametrize("revision,expected", [
    ("r0", "cb1e3add90641622941c64d927bcd0b8a3cdf82a9a3468b48598e26c7148670d"),
    ("r1", "a1d16665985a9a7370d320370a18fc79eb14bdfc4d0bc4d7fe6c0e37545a7def"),
])
def test_existing_clinic_revisions_are_unchanged(run_probe, revision, expected):
    assert compile_design(run_probe, "clinic", revision)["hash"] == expected


def test_braemar_clinic_has_a_separate_identity_and_detailed_programme(clinic):
    assert clinic["plan_id"] == "braemarhealth-hillside-clinic"
    assert clinic["dimensions"] == {"x": 32, "y": 32, "z": 32}
    assert 4000 < len(clinic["blocks"]) <= 10000
    assert {"entrance-tower", "medical-sign", "stairs", "reception", "consultation",
            "treatment", "roof-services", "landscape"} <= {c["id"] for c in clinic["components"]}
    assert len(clinic["spaces"]) >= 8


def test_reference_motifs_are_geometry_not_only_metadata(clinic):
    cells = {(b["x"], b["y"], b["z"]): b["block"] for b in clinic["blocks"]}
    assert cells[(8, 15, 5)] == "minecraft:end_rod[facing=up]"
    assert cells[(24, 18, 3)] == "minecraft:cyan_concrete"
    assert cells[(26, 17, 3)] == "minecraft:lime_concrete"
    assert cells[(20, 17, 5)] == "minecraft:glass"
    assert cells[(20, 19, 4)].startswith("minecraft:smooth_quartz_slab")
    assert cells[(18, 4, 7)] == "minecraft:gray_concrete"
    assert cells[(16, 15, 4)].startswith("minecraft:iron_bars[")
    assert cells.get((26, 2, 5), "minecraft:air") == "minecraft:air"


def test_all_clinical_floors_and_rooms_are_reachable(clinic):
    cells = {(b["x"], b["y"], b["z"]): b["block"] for b in clinic["blocks"]}
    def empty(p):
        return cells.get(p, "minecraft:air") == "minecraft:air"
    seen, queue = {(10, 1, 1)}, deque([(10, 1, 1)])
    while queue:
        x, y, z = queue.popleft()
        for dx, dz in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            for dy in [-1, 0, 1]:
                p = (x+dx, y+dy, z+dz)
                px, py, pz = p
                if (p not in seen and 0 <= px < 32 and 1 <= py < 31 and 0 <= pz < 32
                        and empty(p) and empty((px, py+1, pz)) and not empty((px, py-1, pz))):
                    seen.add(p); queue.append(p)
    targets = [(10, 2, 10), (16, 2, 12), (22, 2, 19), (22, 2, 24),
               (10, 8, 24), (16, 8, 12), (22, 8, 19), (22, 8, 24),
               (10, 14, 24), (16, 14, 12), (22, 14, 19), (22, 14, 24)]
    assert set(targets) <= seen, f"Unreachable: {set(targets)-seen}"


def test_braemar_clinic_meshes_with_the_existing_assets(clinic):
    result = subprocess.run(["node", "-e",
        "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{"
        "const m=require('./preview/mesh.cjs').meshArtifact(JSON.parse(s),32);"
        "console.log(m.sections.reduce((n,p)=>n+p.positions.length,0));});"],
        cwd=ROOT, input=json.dumps(clinic), text=True, capture_output=True, check=True)
    assert int(result.stdout) > 0
