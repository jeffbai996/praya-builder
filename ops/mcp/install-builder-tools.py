#!/usr/bin/env python3
"""Install the canonical Builder MCP tool module without restarting the MCP service."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import tempfile


def atomic_write(path: Path, data: bytes, mode: int = 0o644) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=path.name + ".", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as output:
            output.write(data)
            output.flush()
            os.fsync(output.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass


def install(target: Path, source: Path) -> dict[str, bool | str]:
    server = target / "server.py"
    if not server.is_file():
        raise FileNotFoundError(f"MCP server not found: {server}")
    module = target / "tools_builder.py"
    source_bytes = source.read_bytes()
    copied = not module.exists() or module.read_bytes() != source_bytes
    if copied:
        atomic_write(module, source_bytes)

    text = server.read_text(encoding="utf-8")
    imports = re.findall(r"(?m)^import tools_builder(?:\s+#.*)?$", text)
    if len(imports) > 1:
        raise RuntimeError("server.py contains duplicate tools_builder imports")
    registered = not imports
    if registered:
        match = re.search(r"(?m)^import tools_admin(?:\s+#.*)?$", text)
        if not match:
            raise RuntimeError("server.py has no tools_admin import anchor")
        end = match.end()
        text = text[:end] + "\nimport tools_builder  # noqa: F401,E402" + text[end:]
        atomic_write(server, text.encode("utf-8"), server.stat().st_mode & 0o777)
    return {"target": str(target), "module_updated": copied, "import_added": registered, "service_restarted": False}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", default=os.environ.get("PRAYA_MCP_DIR", "/home/jbai/minecraft/praya/mcp"))
    args = parser.parse_args()
    source = Path(__file__).with_name("tools_builder.py")
    print(json.dumps(install(Path(args.target).resolve(), source), sort_keys=True))


if __name__ == "__main__":
    main()
