"""Decode the browser exporter with an independent, minimal big-endian NBT reader."""
import gzip
import io
import json
from pathlib import Path
import struct
import subprocess

import pytest

PREVIEW = Path(__file__).resolve().parents[1] / "preview"
pytestmark = pytest.mark.skipif(not (PREVIEW / "node_modules/prismarine-nbt").exists(),
                                reason="preview dependencies not installed")
ARTIFACTS = sorted(p for p in (PREVIEW / "generated").glob("*.json") if ".plan." not in p.name)


def decode(data):
    stream = io.BytesIO(gzip.decompress(data))

    def number(fmt):
        return struct.unpack(">" + fmt, stream.read(struct.calcsize(fmt)))[0]

    def string():
        return stream.read(number("H")).decode("utf-8")

    def value(tag):
        if tag in (1, 2, 3):
            return number({1: "b", 2: "h", 3: "i"}[tag])
        if tag == 7:
            return stream.read(number("i"))
        if tag == 8:
            return string()
        if tag == 9:
            child, length = number("B"), number("i")
            return [value(child) for _ in range(length)]
        if tag == 10:
            result = {}
            while (child := number("B")):
                name = string()
                result[name] = value(child)
            return result
        if tag == 11:
            return [number("i") for _ in range(number("i"))]
        raise AssertionError(f"Unexpected tag {tag}")

    assert number("B") == 10
    assert string() == ""
    root = value(10)
    assert stream.read() == b""
    return root["Schematic"]


def indexes(data):
    result, current, shift = [], 0, 0
    for byte in data:
        current |= (byte & 127) << shift
        if byte & 128:
            shift += 7
            assert shift < 35
        else:
            result.append(current)
            current, shift = 0, 0
    assert shift == 0
    return result


def export(file, mutation=""):
    return subprocess.run(["node", "-e",
        "const a=JSON.parse(require('fs').readFileSync(process.argv[1]));"
        + mutation + ";process.stdout.write(require('./schematic.cjs').exportSchematic(a));",
        str(file)], cwd=PREVIEW, capture_output=True, timeout=30)


@pytest.mark.parametrize("file", ARTIFACTS, ids=lambda p: p.stem)
def test_export_preserves_every_cell_and_empty_space(file):
    artifact = json.loads(file.read_text())
    result = export(file)
    assert result.returncode == 0, result.stderr.decode()
    schematic = decode(result.stdout)
    dims = artifact["dimensions"]
    assert schematic["Version"] == 3
    assert schematic["DataVersion"] == 4189
    assert [schematic[k] for k in ("Width", "Height", "Length")] == [dims[k] for k in "xyz"]
    assert schematic["Offset"] == [0, 0, 0]
    assert schematic["Metadata"]["BuilderArtifactHash"] == artifact["hash"]
    assert schematic["Blocks"]["BlockEntities"] == []
    palette = {index: state for state, index in schematic["Blocks"]["Palette"].items()}
    cells = [palette[i] for i in indexes(schematic["Blocks"]["Data"])]
    expected = ["minecraft:air"] * (dims["x"] * dims["y"] * dims["z"])
    for cell in artifact["blocks"]:
        expected[cell["x"] + cell["z"] * dims["x"] + cell["y"] * dims["x"] * dims["z"]] = cell["block"]
    assert cells == expected
    assert export(file).stdout == result.stdout


@pytest.mark.parametrize("mutation", [
    "a.hash='0'.repeat(64)",
    "a.dimensions.x=999999999",
    "a.blocks.push(a.blocks[0])",
    "a.blocks[0].x=-1",
    "a.blocks[0].block='minecraft:stone[bogus=true]'",
])
def test_invalid_exports_fail_closed(mutation):
    # Re-sign all except the explicit identity test to exercise structural validation.
    if not mutation.startswith("a.hash"):
        mutation += ";const {hash,...content}=a;a.hash=require('crypto').createHash('sha256').update(JSON.stringify(content)).digest('hex')"
    result = export(ARTIFACTS[0], mutation)
    assert result.returncode != 0
    assert not result.stdout


def test_varints_cross_single_byte_palette_boundary():
    result = subprocess.run(["node", "-e",
        "process.stdout.write(require('./schematic.cjs').encodeVarints([0,127,128,255,16384]));"],
        cwd=PREVIEW, capture_output=True, check=True)
    assert indexes(result.stdout) == [0, 127, 128, 255, 16384]
