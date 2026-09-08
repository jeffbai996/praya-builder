"""R1 follows the glazing, brand and built-signage review instructions."""
import json
import subprocess
from collections import deque

import pytest

from test_irregular_designs import compile_design, ROOT


@pytest.fixture(scope="module")
def revised(run_probe):
    return compile_design(run_probe, "braemar", "r1")


def test_braemar_r0_remains_immutable(run_probe):
    assert compile_design(run_probe, "braemar", "r0")["hash"] == "f91a1687a0c2492e1010c172a537635e34a9ebba530ca2b8def14c0981fe9715"


def test_clinic_is_larger_but_within_the_block_budget(revised, run_probe):
    old = compile_design(run_probe, "braemar", "r0")
    assert revised["dimensions"] == {"x": 36, "y": 32, "z": 36}
    assert len(old["blocks"]) < len(revised["blocks"]) <= 10000
    def floor_area(artifact):
        return sum(b["y"] == 1 and b["component"] == "envelope" for b in artifact["blocks"])
    assert 1.2 < floor_area(revised) / floor_area(old) < 1.35


def test_glazing_uses_connected_tinted_panes_and_intentional_clear_panes(revised):
    blocks = [b["block"] for b in revised["blocks"]]
    assert not any(b.split("[")[0] in {"minecraft:glass", "minecraft:tinted_glass"} for b in blocks)
    tinted = [b for b in blocks if "stained_glass_pane[" in b]
    clear = [b for b in blocks if b.startswith("minecraft:glass_pane[")]
    assert len(tinted) > len(clear) > 0
    assert any("north=true" in b and "south=true" in b for b in tinted)
    assert any("east=true" in b and "west=true" in b for b in tinted)


def test_logo_matches_the_reference_from_the_public_front(revised):
    cells = {(b["x"], b["y"], b["z"]): b["block"] for b in revised["blocks"]
             if b["component"] == "medical-sign"}
    pattern = ["..CC....", "..CC....", "CCCCGGGG", "CCCCGGGG", "....GG..", "....GG.."]
    for row, line in enumerate(pattern):
        for column, pixel in enumerate(line):
            actual = cells.get((31-column, 19-row, 3))
            expected = {"C": "minecraft:cyan_concrete", "G": "minecraft:lime_concrete"}.get(pixel)
            assert actual == expected, (row, column, actual, expected)


def test_signage_is_compiled_geometry_and_reads_toward_the_street(revised):
    ids = {c["id"] for c in revised["components"]}
    assert {"clinic-lettering", "entrance-sign", "identity-monument"} <= ids
    result = subprocess.run(["node", "-e",
        "console.log(JSON.stringify(require('./preview/block-lettering.cjs').letterPixels('CLINIC')))"] ,
        cwd=ROOT, capture_output=True, text=True, check=True)
    pixels = json.loads(result.stdout)
    letters = {(b["x"], b["y"], b["z"]) for b in revised["blocks"] if b["component"] == "clinic-lettering"}
    assert letters == {(32-u, 11-v, 5) for u, v in pixels}


def test_enlarged_rooms_and_landings_remain_reachable(revised):
    cells = {(b['x'], b['y'], b['z']): b['block'] for b in revised['blocks']}
    def empty(p):
        return cells.get(p, 'minecraft:air') == 'minecraft:air'
    seen, queue = {(10, 1, 1)}, deque([(10, 1, 1)])
    while queue:
        x, y, z = queue.popleft()
        for dx, dz in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            for dy in [-1, 0, 1]:
                p = (x+dx, y+dy, z+dz)
                px, py, pz = p
                if (p not in seen and 0 <= px < 36 and 1 <= py < 31 and 0 <= pz < 36
                        and empty(p) and empty((px, py+1, pz)) and not empty((px, py-1, pz))):
                    seen.add(p); queue.append(p)
    targets = {(x, y, z) for y in [2, 8, 14] for x, z in [(10, 24), (16, 12), (22, 19), (22, 24), (30, 20), (30, 26)]}
    assert targets <= seen, targets-seen


def test_revised_panes_signage_and_larger_bounds_mesh(revised):
    result = subprocess.run(['node', '-e',
        "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{"
        "const m=require('./preview/mesh.cjs').meshArtifact(JSON.parse(s),32);"
        "console.log(m.sections.reduce((n,p)=>n+p.positions.length,0));});"],
        cwd=ROOT, input=json.dumps(revised), text=True, capture_output=True, check=True)
    assert int(result.stdout) > 0
