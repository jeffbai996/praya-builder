import json
from pathlib import Path

import pytest

PROBE = "org.govpraya.builder.plan.PlanWorkspaceProbe"


def base_plan():
    return {
        "schema_version": 2,
        "plan_id": "v2-probe",
        "revision": "r1",
        "dimensions": {"x": 16, "y": 16, "z": 16},
        "palette": {
            "wall": "minecraft:stone",
            "inside": "minecraft:air",
            "stairs": "minecraft:oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]",
            "sign": "minecraft:oak_wall_sign[facing=north,waterlogged=false]",
        },
        "components": [{
            "id": "caller", "role": "building", "origin": [0, 0, 0],
            "operations": [],
        }],
        "spaces": [],
    }


def part(part_id="test.fixture", *, parameters=None, bounds=None, components=None, signs=None, rotation=None):
    value = {
        "schema_version": 1,
        "id": part_id,
        "description": "Focused schema-v2 fixture",
        "provenance": {"author": "builder", "project": "builder"},
        "style": "test",
        "parameters": parameters or {},
        "bounds": bounds or {"min": [0, 0, 0], "max": [4, 4, 4]},
        "components": components or [{
            "id": "body", "role": "fixture", "origin": [0, 0, 0],
            "operations": [{"op": "block", "at": [0, 0, 0], "material": "wall"}],
        }],
        "test": {"at": [0, 0, 0], "params": {}, "expect": {"valid": True}},
    }
    if signs is not None:
        value["signs"] = signs
    if rotation is not None:
        value["rotation"] = rotation
    return value


def write_parts(tmp_path: Path, *parts):
    root = tmp_path / "parts"
    root.mkdir()
    for index, value in enumerate(parts):
        (root / f"part-{index}.json").write_text(json.dumps(value))
    return root


def compile_plan(run_probe, value, parts=None):
    args = [json.dumps(value)]
    if parts is not None:
        args.append(str(parts))
    result = run_probe(PROBE, *args)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)


def reject(run_probe, value, parts, message=None):
    result = run_probe(PROBE, json.dumps(value), str(parts))
    assert result.returncode != 0
    assert not result.stdout.strip()
    if message:
        assert message in result.stderr


def test_fill_uses_shell_and_interior_roles(run_probe):
    value = base_plan()
    value["components"][0]["operations"] = [{
        "op": "fill", "min": [1, 1, 1], "max": [4, 4, 4],
        "material": "wall", "interior": "inside",
    }]
    blocks = compile_plan(run_probe, value)["blocks"]
    assert len(blocks) == 27
    assert next(block for block in blocks if (block["x"], block["y"], block["z"]) == (2, 2, 2))["block"] == "minecraft:air"
    assert sum(block["block"] == "minecraft:stone" for block in blocks) == 26


def test_nested_repeat_depth_three_and_scalar_templates(run_probe, tmp_path):
    value = base_plan()
    leaf = {"op": "block", "at": [{"param": "offset"}, 0, 0], "material": "wall"}
    # Top-level plans have no parameters, so exercise templates through a called part.
    fixture = part(parameters={"offset": {"type": "integer", "min": 0, "max": 3, "default": 0}},
        components=[{"id": "body", "role": "fixture", "origin": [0, 0, 0], "operations": [
            {"op": "repeat", "count": 2, "step": [4, 0, 0], "operations": [
                {"op": "repeat", "count": 2, "step": [0, 4, 0], "operations": [
                    {"op": "repeat", "count": 2, "step": [0, 0, 4], "operations": [leaf]}
                ]}
            ]}
        ]}], bounds={"min": [0, 0, 0], "max": [8, 8, 8]})
    parts = write_parts(tmp_path, fixture)
    value["components"][0]["operations"] = [{"op": "call", "part": "test.fixture", "at": [0, 0, 0], "params": {"offset": 1}}]
    assert len(compile_plan(run_probe, value, parts)["blocks"]) == 8
    fixture["components"][0]["operations"][0]["operations"][0]["operations"][0]["operations"] = [
        {"op": "repeat", "count": 1, "step": [0, 0, 0], "operations": [leaf]}
    ]
    (parts / "part-0.json").write_text(json.dumps(fixture))
    reject(run_probe, value, parts, "Repeat nesting depth exceeded")


def test_call_rotation_preserves_owner_and_rotates_directional_state(run_probe, tmp_path):
    fixture = part(
        parameters={"facing": {"type": "enum", "values": ["north", "east"], "default": "north"}},
        bounds={"min": [0, 0, 0], "max": [2, 1, 1]},
        components=[{"id": "internal", "role": "hidden", "origin": [0, 0, 0], "operations": [
            {"op": "box", "min": [0, 0, 0], "max": [2, 1, 1], "material": "stairs"}
        ]}],
        rotation={"param": "facing", "turns": {"north": 0, "east": 1}},
    )
    parts = write_parts(tmp_path, fixture)
    value = base_plan()
    value["components"][0]["origin"] = [5, 0, 5]
    value["components"][0]["operations"] = [{"op": "call", "part": "test.fixture", "at": [0, 0, 0], "params": {"facing": "east"}}]
    blocks = compile_plan(run_probe, value, parts)["blocks"]
    assert {(b["x"], b["z"]) for b in blocks} == {(5, 5), (5, 6)}
    assert {b["component"] for b in blocks} == {"caller"}
    assert all("facing=east" in b["block"] for b in blocks)


def test_call_sign_slot_attaches_text_after_rotation(run_probe, tmp_path):
    fixture = part(
        parameters={"facing": {"type": "enum", "values": ["north", "east"], "default": "east"}},
        bounds={"min": [0, 0, 0], "max": [1, 2, 1]},
        components=[{"id": "sign", "role": "sign", "origin": [0, 0, 0], "operations": [
            {"op": "block", "at": [0, 1, 0], "material": "sign"}
        ]}],
        signs=[{"id": "label", "at": [0, 1, 0], "required": True}],
        rotation={"param": "facing", "turns": {"north": 0, "east": 1}},
    )
    parts = write_parts(tmp_path, fixture)
    value = base_plan()
    value["components"][0]["origin"] = [4, 0, 4]
    lines = ["Corner", "Court", "", ""]
    value["components"][0]["operations"] = [{"op": "call", "part": "test.fixture", "at": [0, 0, 0], "signs": {"label": lines}}]
    artifact = compile_plan(run_probe, value, parts)
    assert artifact["signs"] == [{"at": [4, 1, 4], "lines": lines}]
    assert "facing=east" in artifact["blocks"][0]["block"]


@pytest.mark.parametrize("mutation,message", [
    (lambda p: p["components"][0]["operations"][0].update(params={"missing": 1}), "Unknown part parameter"),
    (lambda p: p["components"][0]["operations"][0].update(params={"width": 99}), "outside bounds"),
])
def test_call_parameters_are_closed_and_bounded(run_probe, tmp_path, mutation, message):
    fixture = part(parameters={"width": {"type": "integer", "min": 1, "max": 4, "default": 2}})
    parts = write_parts(tmp_path, fixture)
    value = base_plan(); value["components"][0]["operations"] = [{"op": "call", "part": "test.fixture", "at": [0, 0, 0]}]
    mutation(value); reject(run_probe, value, parts, message)


def test_part_local_bounds_are_enforced(run_probe, tmp_path):
    fixture = part(bounds={"min": [0, 0, 0], "max": [1, 1, 1]}, components=[{
        "id": "body", "role": "fixture", "origin": [0, 0, 0],
        "operations": [{"op": "block", "at": [1, 0, 0], "material": "wall"}],
    }])
    parts = write_parts(tmp_path, fixture)
    value = base_plan(); value["components"][0]["operations"] = [{"op": "call", "part": "test.fixture", "at": [0, 0, 0]}]
    reject(run_probe, value, parts, "Part operation outside declared bounds")


def test_workspace_cycles_and_symlinks_are_rejected(run_probe, tmp_path):
    first = part("test.first", components=[{"id": "a", "role": "test", "origin": [0, 0, 0], "operations": [
        {"op": "call", "part": "test.second", "at": [0, 0, 0]}
    ]}])
    second = part("test.second", components=[{"id": "b", "role": "test", "origin": [0, 0, 0], "operations": [
        {"op": "call", "part": "test.first", "at": [0, 0, 0]}
    ]}])
    parts = write_parts(tmp_path, first, second)
    result = run_probe(PROBE, "--parts", str(parts))
    assert result.returncode != 0 and "cycle" in result.stderr.lower()
    link = tmp_path / "linked-parts"
    try:
        link.symlink_to(parts, target_is_directory=True)
    except OSError:
        pytest.skip("symlinks unavailable")
    result = run_probe(PROBE, "--parts", str(link))
    assert result.returncode != 0 and "real directory" in result.stderr


def test_expanded_primitive_and_work_budgets_are_enforced(run_probe, tmp_path):
    fixture = part(bounds={"min": [0, 0, 0], "max": [1, 1, 1]})
    parts = write_parts(tmp_path, fixture)
    value = base_plan()
    value["components"][0]["operations"] = [{"op": "repeat", "count": 4097, "step": [0, 0, 0], "operations": [
        {"op": "block", "at": [0, 0, 0], "material": "wall"}
    ]}]
    reject(run_probe, value, parts, "Repeat count outside limits")
    value["components"][0]["operations"] = [
        {"op": "repeat", "count": 4096, "step": [0, 0, 0], "operations": [
            {"op": "block", "at": [0, 0, 0], "material": "wall"}
        ]},
        {"op": "block", "at": [1, 0, 0], "material": "wall"},
    ]
    reject(run_probe, value, parts, "Expanded operation limit exceeded")
    value["components"][0]["operations"] = [{"op": "box", "min": [0, 0, 0], "max": [16, 16, 16], "material": "wall"} for _ in range(25)]
    reject(run_probe, value, parts, "Expansion work limit exceeded")


def test_zero_emission_calls_still_consume_traversal_budget(run_probe, tmp_path):
    fixture = part(
        parameters={"variant": {"type": "enum", "values": ["on", "off"], "default": "off"}},
        components=[{"id": "optional", "role": "test", "origin": [0, 0, 0],
                     "when": {"param": "variant", "equals": "on"},
                     "operations": [{"op": "block", "at": [0, 0, 0], "material": "wall"}]}],
    )
    parts = write_parts(tmp_path, fixture)
    value = base_plan()
    leaf = {"op": "call", "part": "test.fixture", "at": [0, 0, 0], "params": {"variant": "off"}}
    value["components"][0]["operations"] = [{"op": "repeat", "count": 100, "step": [0, 0, 0], "operations": [
        {"op": "repeat", "count": 100, "step": [0, 0, 0], "operations": [
            {"op": "repeat", "count": 100, "step": [0, 0, 0], "operations": [leaf]}
        ]}
    ]}]
    reject(run_probe, value, parts, "Expanded operation traversal limit exceeded")
