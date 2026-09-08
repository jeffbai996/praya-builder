"""Conservative voxel circulation checks, not a substitute for a player trial."""
from collections import deque
import json
from pathlib import Path
import subprocess

import pytest


@pytest.fixture(scope="module")
def apartments(run_probe):
    root = Path(__file__).resolve().parents[1]
    values = {}
    for revision in ["r0", "r1", "r2"]:
        plan = subprocess.run(["node", "-e",
            "console.log(JSON.stringify(require('./preview/apartment.cjs').apartment(process.argv[1])))", revision],
            cwd=root, capture_output=True, text=True, check=True).stdout
        result = run_probe("org.govpraya.builder.plan.PlanProbe", plan)
        assert result.returncode == 0, result.stderr
        values[revision] = json.loads(result.stdout)
    return values


def test_apartment_revision_stays_inside_approved_component_scope(apartments):
    before = {(b["x"], b["y"], b["z"]): b for b in apartments["r0"]["blocks"]}
    after = {(b["x"], b["y"], b["z"]): b for b in apartments["r1"]["blocks"]}
    changed = {p for p in before.keys() | after.keys() if before.get(p) != after.get(p)}
    assert changed
    assert {b["component"] for p in changed for b in [before.get(p), after.get(p)] if b} <= {
        "floors", "balconies", "entrance", "landscape"}


@pytest.mark.parametrize("revision", ["r0", "r1", "r2"])
def test_all_six_units_bedrooms_bathrooms_and_roof_have_a_route(apartments, revision):
    artifact = apartments[revision]
    cells = {(b["x"], b["y"], b["z"]): b["block"] for b in artifact["blocks"]}

    def open_cell(pos):
        value = cells.get(pos, "minecraft:air")
        return value == "minecraft:air" or value.startswith("minecraft:oak_door[")

    def walkable(p):
        x, y, z = p
        return (0 <= x < 32 and 1 <= y < 24 and 0 <= z < 32 and open_cell(p)
                and open_cell((x, y + 1, z)) and not open_cell((x, y - 1, z)))

    start = (15, 1, 3)
    assert walkable(start)
    visited = {start}
    queue = deque([start])
    while queue:
        x, y, z = queue.popleft()
        for dx, dz in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            for dy in [-1, 0, 1]:
                candidate = (x + dx, y + dy, z + dz)
                if candidate not in visited and walkable(candidate):
                    visited.add(candidate)
                    queue.append(candidate)
    for floor in [1, 6, 11]:
        for x in [6, 19]:
            for destination in [(x + 3, floor + 1, 11), (x + 3, floor + 1, 23),
                                (x + 5, floor + 1, 21)]:
                assert destination in visited, f"Unreachable unit space: {destination}"
    assert (16, 17, 12) in visited, "Roof terrace cannot be reached"


def test_six_apartment_doors_have_matching_halves(apartments):
    blocks = apartments["r1"]["blocks"]
    lower = [b for b in blocks if "oak_door" in b["block"] and "half=lower" in b["block"]]
    assert len(lower) == 6
    cells = {(b["x"], b["y"], b["z"]): b["block"] for b in blocks}
    for b in lower:
        assert cells[(b["x"], b["y"] + 1, b["z"])] == b["block"].replace("half=lower", "half=upper")


def test_modern_revision_preserves_layout_and_earlier_reviewed_artifacts(apartments):
    assert apartments["r0"]["hash"] == "5ec72a2d08522b59f0d76a87aaea96fcfdee9b9115670bdceb3af8cdb5b5d752"
    assert apartments["r1"]["hash"] == "a4e1697a982247100dced54e5b00a9954bdb447d6c31a91f7910782b107ff2b4"
    for component in ["partitions", "stairs", "furnishing", "site", "floors", "landscape"]:
        assert [b for b in apartments["r1"]["blocks"] if b["component"] == component] == [
            b for b in apartments["r2"]["blocks"] if b["component"] == component]


def test_modern_revision_replaces_brick_facades_and_heavy_pergola(apartments):
    cells = apartments["r2"]["blocks"]
    assert not any(b["block"] == "minecraft:bricks" for b in cells)
    assert any(b["block"] == "minecraft:gray_concrete" for b in cells)
    roof = [b for b in cells if b["component"] == "roof"]
    assert max(b["y"] for b in roof) <= 20
    assert any("quartz_slab" in b["block"] for b in roof)
