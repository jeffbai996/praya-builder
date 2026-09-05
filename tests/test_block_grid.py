import json

import pytest


PROBE = "org.govpraya.builder.generation.BlockGridProbe"


def grid(**changes):
    value = {
        "name": "Example house",
        "dimensions": {"x": 2, "y": 3, "z": 4},
        "blocks": [{"x": 1, "y": 2, "z": 3, "block": "minecraft:stone"}],
    }
    value.update(changes)
    return value


def test_existing_block_json_remains_compatible(run_probe):
    result = run_probe(PROBE, json.dumps(grid()))
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "2,3,4,1\nminecraft:stone"


def test_legacy_json_without_dimensions_remains_compatible(run_probe):
    value = grid()
    del value["dimensions"]
    result = run_probe(PROBE, json.dumps(value))
    assert result.returncode == 0, result.stderr
    assert result.stdout.startswith("48,64,48,1")


def test_directional_block_state_is_preserved(run_probe):
    block = "minecraft:oak_stairs[facing=east,half=top,shape=straight,waterlogged=false]"
    result = run_probe(PROBE, json.dumps(grid(blocks=[{"x": 0, "y": 0, "z": 0, "block": block}])))
    assert result.returncode == 0, result.stderr
    assert block in result.stdout


@pytest.mark.parametrize("dimensions", [
    {"x": 0, "y": 3, "z": 4},
    {"x": -1, "y": 3, "z": 4},
    {"x": 49, "y": 3, "z": 4},
    {"x": 2.5, "y": 3, "z": 4},
    {"x": "2", "y": 3, "z": 4},
])
def test_invalid_dimensions_are_rejected_instead_of_clipped(run_probe, dimensions):
    result = run_probe(PROBE, json.dumps(grid(dimensions=dimensions)))
    assert result.returncode != 0


@pytest.mark.parametrize("coordinate", [-1, 2, 48, 0.5, "1", 4294967297])
def test_bad_coordinates_fail_the_whole_build(run_probe, coordinate):
    block = {"x": coordinate, "y": 0, "z": 0, "block": "minecraft:stone"}
    result = run_probe(PROBE, json.dumps(grid(blocks=[block])))
    assert result.returncode != 0


@pytest.mark.parametrize("blocks", [
    [],
    [{"x": 0, "y": 0, "z": 0, "block": "stone"}],
    [{"x": 0, "y": 0, "z": 0, "block": "minecraft:stone[broken]"}],
    [{"x": 0, "y": 0, "z": 0, "block": "minecraft:stone"}] * 2,
])
def test_empty_malformed_or_conflicting_builds_are_rejected(run_probe, blocks):
    result = run_probe(PROBE, json.dumps(grid(blocks=blocks)))
    assert result.returncode != 0


def test_configured_block_budget_is_enforced(run_probe):
    blocks = [{"x": x, "y": 0, "z": 0, "block": "minecraft:stone"} for x in range(2)]
    result = run_probe(PROBE, json.dumps(grid(blocks=blocks)), "1")
    assert result.returncode != 0
    assert "between 1 and 1 blocks" in result.stderr


@pytest.mark.parametrize("payload", ["{", "null", "[]", '{"blocks":null}'])
def test_malformed_documents_are_rejected(run_probe, payload):
    assert run_probe(PROBE, payload).returncode != 0
