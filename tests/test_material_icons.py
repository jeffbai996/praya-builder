"""Material thumbnails reuse the installed block models, including non-cubes."""
import json
import subprocess
from pathlib import Path

import pytest

PREVIEW = Path(__file__).resolve().parents[1] / "preview"
pytestmark = pytest.mark.skipif(not (PREVIEW / "node_modules/prismarine-viewer").exists(),
                                reason="preview dependencies not installed")


@pytest.mark.parametrize("name,height", [
    ("smooth_quartz", 1), ("smooth_quartz_slab", .5),
    ("quartz_stairs", 1), ("glass_pane", 1), ("oak_door", 2),
])
def test_material_icons_preserve_block_shape(name, height):
    result = subprocess.run(["node", "-e",
        "const m=require('./material-icons.cjs').materialIcon(process.argv[1]);"
        "const ys=m.sections.flatMap(s=>s.positions.filter((v,i)=>i%3===1).map(v=>v+s.sy));"
        "console.log(JSON.stringify({height:Math.max(...ys)-Math.min(...ys),vertices:ys.length}));",
        name], cwd=PREVIEW, text=True, capture_output=True, check=True)
    data = json.loads(result.stdout)
    assert data["height"] == height
    assert data["vertices"] > 0


def test_air_icon_is_intentionally_empty():
    result = subprocess.run(["node", "-e",
        "console.log(JSON.stringify(require('./material-icons.cjs').materialIcon('air')));"],
        cwd=PREVIEW, text=True, capture_output=True, check=True)
    assert json.loads(result.stdout)["sections"] == []


@pytest.mark.parametrize("name", ["../stone", "no_such_block", "stone[bad=true]"])
def test_invalid_material_icon_names_are_rejected(name):
    result = subprocess.run(["node", "-e",
        "require('./material-icons.cjs').materialIcon(process.argv[1])", name],
        cwd=PREVIEW, text=True, capture_output=True)
    assert result.returncode != 0
