#!/usr/bin/env python3
"""Install the Praya map UI and remove the retired transport marker sets.

Dry-run by default. Apply requires --apply. Does not touch Minecraft world data.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import tempfile


REMOVED = {"streets", "street-pins", "mrt"}
BACKUP_SUFFIX = ".before-map-theme-20260923"
STYLESHEET = "praya-map.css"
FONT_FILES = (
    "plus-jakarta-sans-latin-400-normal.woff2",
    "plus-jakarta-sans-latin-600-normal.woff2",
    "plus-jakarta-sans-latin-700-normal.woff2",
)


def register_style(conf: str) -> str:
    match = re.search(r"(?m)^styles:\s*\[([^\]]*)\]", conf)
    if not match:
        raise ValueError("BlueMap webapp.conf has no styles list")
    entries = match.group(1)
    if re.search(r'"praya-map\.css"', entries):
        return conf
    before = entries.rstrip()
    if before and not before.rstrip().endswith((',', '[')) and not before.splitlines()[-1].lstrip().startswith('#'):
        before += ","
    new_entries = before + '\n  "praya-map.css"\n'
    return conf[:match.start()] + "styles: [" + new_entries + "]" + conf[match.end():]


def remove_marker_sets(conf: str) -> tuple[str, dict[str, int]]:
    match = re.search(r"(?m)^marker-sets:\s*", conf)
    if not match:
        raise ValueError("BlueMap world.conf has no marker-sets block")
    markers, end = json.JSONDecoder().raw_decode(conf[match.end():])
    if not isinstance(markers, dict):
        raise ValueError("BlueMap marker-sets block is not an object")
    removed = {name: len(markers[name].get("markers", {})) for name in REMOVED if name in markers}
    kept = {name: value for name, value in markers.items() if name not in REMOVED}
    replacement = json.dumps(kept, ensure_ascii=False, indent=2)
    return conf[:match.end()] + replacement + conf[match.end() + end:], removed


def brand_index(html: str) -> str:
    replacements = {
        '<title>BlueMap</title>': '<title>Praya Map</title>',
        'content="BlueMap is a tool that generates 3D maps of your Minecraft worlds and displays them in your browser"': 'content="Explore the Praya main world in 2D and 3D"',
        'content="BlueMap"': 'content="Praya Map"',
        'content="#006EDE"': 'content="#17181c"',
    }
    for old, new in replacements.items():
        html = html.replace(old, new)
    html = re.sub(r'(<link rel="icon" href=")[^"]+("\s*>)', r'\1./praya-map-icon.svg\2', html, count=1)
    return html


def write_atomic(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_bytes() == content:
        return
    backup = path.with_name(path.name + BACKUP_SUFFIX)
    if path.exists() and not backup.exists():
        shutil.copy2(path, backup)
    fd, temp_name = tempfile.mkstemp(prefix=path.name + ".tmp-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(content)
        os.chmod(temp_name, path.stat().st_mode if path.exists() else 0o644)
        os.replace(temp_name, path)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("server_root", type=Path)
    parser.add_argument("viewer_runtime", type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    root = args.server_root.resolve()
    runtime = args.viewer_runtime.resolve()
    project = Path(__file__).resolve().parents[1]
    web = root / "bluemap/web"
    config = root / "plugins/BlueMap"

    conf_path = config / "webapp.conf"
    world_path = config / "maps/world.conf"
    settings_path = web / "settings.json"
    marker_path = web / "maps/world/live/markers.json"
    index_path = web / "index.html"
    for path in (conf_path, world_path, settings_path, marker_path, index_path):
        if not path.is_file():
            parser.error(f"required file missing: {path}")

    conf = register_style(conf_path.read_text())
    world, removed_from_config = remove_marker_sets(world_path.read_text())
    settings = json.loads(settings_path.read_text())
    settings["styles"] = [style for style in settings.get("styles", []) if style != STYLESHEET] + [STYLESHEET]
    markers = json.loads(marker_path.read_text())
    if not isinstance(markers, dict):
        parser.error("live markers are not an object")
    removed_from_live = {name: len(markers[name].get("markers", {})) for name in REMOVED if name in markers}
    remaining_markers = {name: value for name, value in markers.items() if name not in REMOVED}

    files: dict[Path, bytes] = {
        web / "builder-studio.js": (project / "preview/bluemap-studio.js").read_bytes(),
        web / STYLESHEET: (project / "ops/praya-map/praya-map.css").read_bytes(),
        web / "praya-map-icon.svg": (project / "ops/praya-map/praya-map-icon.svg").read_bytes(),
        runtime / "map-context.js": (project / "ops/praya-map/map-context.js").read_bytes(),
    }
    font_root = web / "praya-map-fonts"
    for name in FONT_FILES:
        files[font_root / name] = (root / "console/static/fonts" / name).read_bytes()
    files[font_root / "AnthropicSansVariable-TextRegular.woff2"] = (
        root / "console/static/local-fonts/AnthropicSansVariable-TextRegular.woff2"
    ).read_bytes()
    files.update({
        world_path: world.encode(),
        marker_path: (json.dumps(remaining_markers, ensure_ascii=False, separators=(",", ":")) + "\n").encode(),
        index_path: brand_index(index_path.read_text()).encode(),
        conf_path: conf.encode(),
        settings_path: (json.dumps(settings, ensure_ascii=False, separators=(",", ":")) + "\n").encode(),
    })

    changed = [str(path) for path, content in files.items() if not path.exists() or path.read_bytes() != content]
    report = {
        "mode": "apply" if args.apply else "dry-run",
        "removed_from_config": removed_from_config,
        "removed_from_live": removed_from_live,
        "preserved_marker_sets": sorted(remaining_markers),
        "changed_files": changed,
    }
    if args.apply:
        for path, content in files.items():
            write_atomic(path, content)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
