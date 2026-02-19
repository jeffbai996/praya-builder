"""
Praya Builder Preview — visualize Gemini-generated structures without a Minecraft server.

Usage:
    python preview.py "5-story glass office tower"          # Live: calls Gemini
    python preview.py --file output/some_building.json      # File: renders saved JSON
    python preview.py "small cube" --save                   # Live + save JSON to output/
"""

import argparse
import json
import os
import re
import ssl
import sys
import urllib.request
from collections import Counter
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from dotenv import load_dotenv

# Same palette as config.yml / BuildPrompt.java
DEFAULT_PALETTE = [
    "minecraft:white_concrete", "minecraft:light_gray_concrete",
    "minecraft:gray_concrete", "minecraft:quartz_block",
    "minecraft:smooth_quartz", "minecraft:stone_bricks",
    "minecraft:polished_andesite",
    "minecraft:glass", "minecraft:light_gray_stained_glass",
    "minecraft:light_blue_stained_glass",
    "minecraft:dark_oak_planks", "minecraft:iron_bars",
    "minecraft:sea_lantern", "minecraft:glowstone",
    "minecraft:smooth_stone", "minecraft:stone_brick_slab",
]

SYSTEM_PROMPT = """You are a Minecraft building generator. You output ONLY valid JSON — no markdown, \
no explanation, no commentary.

Given a building description, generate a 3D block grid as a JSON object with this exact schema:

{
  "name": "string — short building name",
  "dimensions": { "x": int, "y": int, "z": int },
  "blocks": [
    { "x": int, "y": int, "z": int, "block": "minecraft:block_id" }
  ]
}

CONSTRAINTS:
- Y is vertical (up). Ground level is y=0.
- Only use blocks from this palette: %s
- Maximum dimensions: 48x64x48 blocks (width x height x depth)
- Omit air blocks — only include solid blocks
- Use minecraft: namespaced block IDs (e.g., "minecraft:white_concrete")
- Buildings should be structurally plausible (walls, floors, roof, windows)
- Interior floors should have open space (rooms, not solid fill)
- Ground floor should be slightly larger or differentiated (lobby, entrance)

OUTPUT ONLY THE JSON OBJECT. No other text.""" % ", ".join(DEFAULT_PALETTE)

# Block ID → RGB. Unknown blocks get medium gray.
BLOCK_COLORS: dict[str, tuple[float, float, float, float]] = {
    "minecraft:white_concrete":          (0.95, 0.95, 0.95, 1.0),
    "minecraft:light_gray_concrete":     (0.60, 0.60, 0.60, 1.0),
    "minecraft:gray_concrete":           (0.35, 0.35, 0.35, 1.0),
    "minecraft:quartz_block":            (0.93, 0.90, 0.87, 1.0),
    "minecraft:smooth_quartz":           (0.93, 0.90, 0.87, 1.0),
    "minecraft:stone_bricks":            (0.48, 0.48, 0.45, 1.0),
    "minecraft:polished_andesite":       (0.53, 0.55, 0.53, 1.0),
    "minecraft:glass":                   (0.70, 0.85, 0.95, 0.35),
    "minecraft:light_gray_stained_glass":(0.60, 0.65, 0.70, 0.35),
    "minecraft:light_blue_stained_glass":(0.55, 0.75, 0.95, 0.35),
    "minecraft:dark_oak_planks":         (0.26, 0.17, 0.08, 1.0),
    "minecraft:iron_bars":               (0.55, 0.55, 0.55, 0.60),
    "minecraft:sea_lantern":             (0.60, 0.90, 0.85, 1.0),
    "minecraft:glowstone":               (0.90, 0.80, 0.45, 1.0),
    "minecraft:smooth_stone":            (0.50, 0.50, 0.50, 1.0),
    "minecraft:stone_brick_slab":        (0.48, 0.48, 0.45, 1.0),
    "minecraft:stone":                   (0.50, 0.50, 0.50, 1.0),
}
DEFAULT_COLOR = (0.50, 0.50, 0.50, 1.0)

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent"
GEMINI_MODEL = "gemini-2.5-flash"


def call_gemini(description: str, api_key: str) -> dict:
    """Call Gemini API with the building prompt. Returns parsed JSON."""
    body = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"parts": [{"text": description}]}],
        "generationConfig": {
            "temperature": 0.7,
            "responseMimeType": "application/json",
        },
    }
    url = GEMINI_URL % GEMINI_MODEL + "?key=" + api_key
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=90, context=ctx) as resp:
        raw = json.loads(resp.read().decode())

    text = raw["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(text)


def print_stats(data: dict) -> None:
    """Print structure metadata and block distribution."""
    dims = data.get("dimensions", {})
    blocks = data.get("blocks", [])
    counts = Counter(b.get("block", "unknown") for b in blocks)

    print(f"\n  Name:       {data.get('name', '(unnamed)')}")
    print(f"  Dimensions: {dims.get('x', '?')} x {dims.get('y', '?')} x {dims.get('z', '?')}")
    print(f"  Blocks:     {len(blocks)} total, {len(counts)} types\n")
    for block_id, count in counts.most_common():
        short = block_id.removeprefix("minecraft:")
        print(f"    {short:30s} {count:>5d}")
    print()


def render(data: dict) -> None:
    """Render the block grid as a 3D voxel plot."""
    blocks = data.get("blocks", [])
    if not blocks:
        print("No blocks to render.", file=sys.stderr)
        return

    # Normalize to origin — Gemini might return negative coords
    xs = [b["x"] for b in blocks]
    ys = [b["y"] for b in blocks]
    zs = [b["z"] for b in blocks]
    ox, oy, oz = min(xs), min(ys), min(zs)
    sx = max(xs) - ox + 1
    sy = max(ys) - oy + 1
    sz = max(zs) - oz + 1

    voxels = np.zeros((sx, sy, sz), dtype=bool)
    colors = np.empty((sx, sy, sz), dtype=object)

    for b in blocks:
        x, y, z = b["x"] - ox, b["y"] - oy, b["z"] - oz
        block_id = b.get("block", "minecraft:stone")
        voxels[x, y, z] = True
        colors[x, y, z] = BLOCK_COLORS.get(block_id, DEFAULT_COLOR)

    fig = plt.figure(figsize=(12, 9))
    ax = fig.add_subplot(111, projection="3d")

    ax.voxels(voxels, facecolors=colors, edgecolors=(0.2, 0.2, 0.2, 0.08), linewidth=0.2)

    ax.set_xlabel("X")
    ax.set_ylabel("Y (up)")
    ax.set_zlabel("Z")
    ax.set_title(data.get("name", "Preview"))

    # 3/4 view
    ax.view_init(elev=25, azim=-60)
    ax.set_box_aspect([sx, sy, sz])

    plt.tight_layout()
    plt.show()


def main() -> None:
    parser = argparse.ArgumentParser(description="Preview Praya Builder structures")
    parser.add_argument("description", nargs="?", help="Building description for Gemini")
    parser.add_argument("--file", "-f", help="Load from saved JSON instead of calling Gemini")
    parser.add_argument("--save", "-s", action="store_true", help="Save Gemini response to output/")
    args = parser.parse_args()

    if not args.description and not args.file:
        parser.error("Provide a building description or --file path")

    if args.file:
        path = Path(args.file)
        if not path.exists():
            print(f"File not found: {path}", file=sys.stderr)
            sys.exit(1)
        data = json.loads(path.read_text())
        print(f"Loaded from {path}")
    else:
        load_dotenv()
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("Set GEMINI_API_KEY in .env or environment", file=sys.stderr)
            sys.exit(1)

        print(f"Calling Gemini ({GEMINI_MODEL})...")
        try:
            data = call_gemini(args.description, api_key)
        except Exception as e:
            print(f"Gemini error: {e}", file=sys.stderr)
            sys.exit(1)

        if args.save:
            out_dir = Path(__file__).parent / "output"
            out_dir.mkdir(exist_ok=True)
            name = re.sub(r"[^a-z0-9_]", "", data.get("name", "structure").replace(" ", "_").lower())
            out_path = out_dir / f"{name}.json"
            out_path.write_text(json.dumps(data, indent=2))
            print(f"Saved to {out_path}")

    print_stats(data)
    render(data)


if __name__ == "__main__":
    main()
