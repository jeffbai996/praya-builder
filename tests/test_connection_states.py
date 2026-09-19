import json


PROBE = "org.govpraya.builder.plan.PlanProbe"


def compile_blocks(run_probe, palette, placements):
    plan = {
        "schema_version": 1,
        "plan_id": "connection-fixture",
        "revision": "r0",
        "dimensions": {"x": 8, "y": 4, "z": 8},
        "palette": palette,
        "components": [{
            "id": "fixture", "role": "fixture", "origin": [0, 0, 0],
            "operations": [{"op": "block", "at": at, "material": material}
                           for at, material in placements],
        }],
    }
    result = run_probe(PROBE, json.dumps(plan))
    assert result.returncode == 0, result.stderr
    artifact = json.loads(result.stdout)
    return {(block["x"], block["y"], block["z"]): block["block"]
            for block in artifact["blocks"]}


def test_panes_bars_walls_and_full_faces_resolve_missing_properties(run_probe):
    blocks = compile_blocks(run_probe, {
        "pane": "minecraft:glass_pane[waterlogged=true]",
        "bars": "minecraft:iron_bars",
        "wall": "minecraft:cobblestone_wall[waterlogged=false]",
        "stone": "minecraft:stone",
    }, [
        ([2, 1, 2], "pane"), ([3, 1, 2], "bars"), ([1, 1, 2], "stone"),
        ([2, 1, 1], "wall"), ([4, 1, 2], "stone"),
    ])
    assert blocks[2, 1, 2] == (
        "minecraft:glass_pane[east=true,north=true,south=false,waterlogged=true,west=true]")
    assert blocks[3, 1, 2] == (
        "minecraft:iron_bars[east=true,north=false,south=false,west=true]")
    assert blocks[2, 1, 1] == (
        "minecraft:cobblestone_wall[east=none,north=none,south=low,up=true,waterlogged=false,west=none]")


def test_fences_connect_only_to_fences_and_full_faces(run_probe):
    blocks = compile_blocks(run_probe, {
        "fence": "minecraft:oak_fence",
        "stone": "minecraft:stone",
        "pane": "minecraft:glass_pane",
    }, [
        ([2, 1, 2], "fence"), ([2, 1, 1], "fence"), ([3, 1, 2], "stone"),
        ([1, 1, 2], "pane"),
    ])
    assert blocks[2, 1, 2] == "minecraft:oak_fence[east=true,north=true,south=false,west=false]"


def test_authored_values_win_while_other_missing_properties_resolve(run_probe):
    authored = "minecraft:glass_pane[east=false,north=false,south=false,waterlogged=true,west=false]"
    blocks = compile_blocks(run_probe, {
        "authored": authored,
        "partial": "minecraft:glass_pane[north=false,waterlogged=true]",
        "stone": "minecraft:stone",
    }, [
        ([1, 1, 1], "authored"), ([2, 1, 1], "stone"),
        ([4, 1, 2], "partial"), ([4, 1, 1], "stone"), ([5, 1, 2], "stone"),
    ])
    assert blocks[1, 1, 1] == authored
    assert blocks[4, 1, 2] == (
        "minecraft:glass_pane[east=true,north=false,south=false,waterlogged=true,west=false]")


def test_stair_shape_resolves_outer_and_inner_corners(run_probe):
    palette = {
        "north": "minecraft:stone_brick_stairs[facing=north,half=bottom,waterlogged=false]",
        "west": "minecraft:stone_brick_stairs[facing=west,half=bottom,waterlogged=false]",
    }
    outer = compile_blocks(run_probe, palette, [([2, 1, 2], "north"), ([2, 1, 1], "west")])
    assert outer[2, 1, 2].endswith("shape=outer_left,waterlogged=false]")
    inner = compile_blocks(run_probe, palette, [([2, 1, 2], "north"), ([2, 1, 3], "west")])
    assert inner[2, 1, 2].endswith("shape=inner_left,waterlogged=false]")


def test_authored_stair_shape_is_unchanged(run_probe):
    authored = "minecraft:stone_brick_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]"
    blocks = compile_blocks(run_probe, {
        "authored": authored,
        "west": "minecraft:stone_brick_stairs[facing=west,half=bottom,waterlogged=false]",
    }, [([2, 1, 2], "authored"), ([2, 1, 1], "west")])
    assert blocks[2, 1, 2] == authored
