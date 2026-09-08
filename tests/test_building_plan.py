import json

import pytest

PROBE = "org.govpraya.builder.plan.PlanProbe"


def plan():
    return {
        "schema_version": 1, "plan_id": "example", "revision": "a",
        "dimensions": {"x": 8, "y": 8, "z": 8},
        "palette": {"wall": "minecraft:stone", "void": "minecraft:air"},
        "components": [{"id": "wall", "role": "facade", "origin": [0, 0, 0],
                        "operations": [{"op": "box", "min": [0, 0, 0],
                                        "max": [4, 3, 1], "material": "wall"}]}],
        "spaces": [],
    }


def compile_plan(run_probe, value):
    result = run_probe(PROBE, json.dumps(value))
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)


def test_compiler_is_deterministic_and_owns_half_open_cells(run_probe):
    first = compile_plan(run_probe, plan())
    assert first == compile_plan(run_probe, plan())
    assert len(first["blocks"]) == 12
    assert {b["component"] for b in first["blocks"]} == {"wall"}
    assert max(b["x"] for b in first["blocks"]) == 3
    assert len(first["hash"]) == 64


def test_air_carving_is_explicit_and_ordered(run_probe):
    value = plan()
    value["components"][0]["operations"].append(
        {"op": "block", "at": [1, 1, 0], "material": "void"})
    artifact = compile_plan(run_probe, value)
    assert len(artifact["blocks"]) == 12
    assert next(b for b in artifact["blocks"] if (b["x"], b["y"], b["z"]) == (1, 1, 0))["block"] == "minecraft:air"


def test_repeat_translates_without_losing_state(run_probe):
    value = plan()
    state = "minecraft:stone_brick_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]"
    value["palette"]["stair"] = state
    value["components"][0]["operations"] = [{"op": "repeat", "count": 3,
        "step": [1, 1, 0], "operations": [{"op": "block", "at": [0, 0, 0], "material": "stair"}]}]
    blocks = compile_plan(run_probe, value)["blocks"]
    assert [(b["x"], b["y"], b["block"]) for b in blocks] == [(i, i, state) for i in range(3)]


@pytest.mark.parametrize("mutation", [
    lambda p: p.update(schema_version=2),
    lambda p: p.update(unknown=True),
    lambda p: p["dimensions"].update(x=0),
    lambda p: p["dimensions"].update(x=49),
    lambda p: p["components"][0].update(origin=[0.5, 0, 0]),
    lambda p: p["components"][0]["operations"][0].update(material="missing"),
    lambda p: p["components"][0]["operations"][0].update(max=[9, 1, 1]),
    lambda p: p["components"][0]["operations"][0].update(max=[2147483647, 1, 1]),
    lambda p: p["components"][0]["operations"][0].update(op="script"),
    lambda p: p["palette"].update(wall="not a block"),
    lambda p: p["components"].append(dict(p["components"][0])),
    lambda p: p["components"].append(dict(p["components"][0], id="overlap")),
])
def test_invalid_plans_fail_before_artifact_output(run_probe, mutation):
    value = plan()
    mutation(value)
    result = run_probe(PROBE, json.dumps(value))
    assert result.returncode != 0
    assert not result.stdout.strip()


def test_nested_repeat_is_rejected(run_probe):
    value = plan()
    inner = {"op": "repeat", "count": 2, "step": [1, 0, 0], "operations": []}
    value["components"][0]["operations"] = [dict(inner, operations=[inner])]
    assert run_probe(PROBE, json.dumps(value)).returncode != 0


def test_oversized_repeat_is_rejected(run_probe):
    value = plan()
    value["components"][0]["operations"] = [{"op": "repeat", "count": 100000,
        "step": [0, 0, 0], "operations": [{"op": "block", "at": [0, 0, 0], "material": "wall"}]}]
    assert run_probe(PROBE, json.dumps(value)).returncode != 0


def test_clearance_collision_is_reported(run_probe):
    value = plan()
    value["spaces"] = [{"id": "doorway", "min": [1, 1, 0], "max": [2, 3, 1]}]
    result = run_probe(PROBE, json.dumps(value))
    assert result.returncode != 0
    assert "doorway" in result.stderr


def test_revision_changes_hash_but_preserves_unrelated_component(run_probe):
    value = plan()
    value["components"].append({"id": "other", "role": "floor", "origin": [0, 0, 2],
        "operations": [{"op": "block", "at": [0, 0, 0], "material": "wall"}]})
    before = compile_plan(run_probe, value)
    value["revision"] = "b"
    value["components"][0]["operations"][0]["max"][0] = 5
    after = compile_plan(run_probe, value)
    assert before["hash"] != after["hash"]
    assert [b for b in before["blocks"] if b["component"] == "other"] == [b for b in after["blocks"] if b["component"] == "other"]
