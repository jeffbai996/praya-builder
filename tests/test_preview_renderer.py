"""Optional renderer regressions; install preview dependencies to run locally."""
import json
from pathlib import Path
import subprocess

import pytest

PREVIEW = Path(__file__).resolve().parents[1] / "preview"
pytestmark = pytest.mark.skipif(not (PREVIEW / "node_modules/prismarine-viewer").exists(),
                                reason="preview dependencies not installed")


def mesh(state, cut=8):
    script = """
const {meshArtifact}=require('./mesh.cjs');
const artifact={dimensions:{x:8,y:8,z:8},blocks:[{x:2,y:2,z:2,block:process.argv[1]}]};
const result=meshArtifact(artifact,Number(process.argv[2]));
const points=result.sections.flatMap(s=>s.positions.map((n,i)=>n+[s.sx,s.sy,s.sz][i%3]));
const ys=points.filter((_,i)=>i%3===1);
console.log(JSON.stringify({vertices:points.length/3,minY:Math.min(...ys),maxY:Math.max(...ys),warnings:result.warnings}));
"""
    result = subprocess.run(["node", "-e", script, state, str(cut)], cwd=PREVIEW,
                            text=True, capture_output=True, timeout=30)
    return result


@pytest.mark.parametrize("state,height", [
    ("minecraft:stone", 1),
    ("minecraft:smooth_stone_slab[type=bottom,waterlogged=false]", 0.5),
    ("minecraft:quartz_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]", 1),
    ("minecraft:glass_pane[east=true,west=true,north=false,south=false,waterlogged=false]", 1),
    ("minecraft:oak_door[facing=west,half=lower,hinge=left,open=false,powered=false]", 1),
])
def test_supported_shapes_produce_geometry_at_exact_coordinates(state, height):
    result = mesh(state)
    assert result.returncode == 0, result.stderr
    data = json.loads(result.stdout)
    assert data["vertices"] > 0
    assert data["minY"] == 2
    assert data["maxY"] == 2 + height
    assert data["warnings"] == []


def test_cutaway_removes_geometry_above_selected_floor():
    result = mesh("minecraft:stone", 2)
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["vertices"] == 0


@pytest.mark.parametrize("state", ["minecraft:no_such_block", "minecraft:quartz_stairs[facing=up]"])
def test_unknown_states_fail_instead_of_becoming_plausible_cubes(state):
    assert mesh(state).returncode != 0


def test_atlas_uvs_stay_inside_their_texture_to_avoid_colored_seams():
    result = subprocess.run(["node", "-e", """
const {meshArtifact}=require('./mesh.cjs');
const model=require('prismarine-viewer/public/blocksStates/1.21.4.json').smooth_quartz.variants[''].model;
const mesh=meshArtifact({dimensions:{x:8,y:8,z:8},blocks:[{x:2,y:2,z:2,block:'minecraft:smooth_quartz'}]});
console.log(JSON.stringify({texture:model.textures.particle,uvs:mesh.sections[0].uvs}));
"""], cwd=PREVIEW, text=True, capture_output=True, check=True)
    data = json.loads(result.stdout)
    texture = data["texture"]
    for u, v in zip(data["uvs"][::2], data["uvs"][1::2]):
        assert texture["u"] < u < texture["u"] + texture["su"]
        assert texture["v"] < v < texture["v"] + texture["sv"]
