# Builder tools for the Praya MCP server

`tools_builder.py` is the canonical, versioned source for seven FastMCP tools
that expose Builder's provider-independent workspace contract. The module makes
HTTP requests only; it has no RCON, placement, service-control or world-write
path.

| Tool | Workspace operation |
| --- | --- |
| `builder_context` | List workspace records, or retrieve one draft context |
| `builder_site` | Retrieve one immutable survey |
| `builder_post_plan` | Compile a structured plan as a new draft |
| `builder_edit` | Compile a version-bound plan, palette or component edit |
| `builder_review` | Retrieve diagnostics, access, site caps and review identity |
| `builder_save` | Save an exact candidate; the required actor is stored as `savedBy` |
| `builder_sheet` | Return a draft or revision manifest with absolute PNG links |

Writes require an explicit `author` object and send `X-Builder-Write: 1`.
`builder_sheet` returns links rather than putting PNG bytes into the MCP result.
IDs, artifact hashes, manifest identities and sheet paths are validated before
use.

The MCP host defaults to
`https://fragbox.tailab4af9.ts.net:8463`. Set `BUILDER_WORKSPACE_URL` to a
different HTTP(S) origin for an isolated workspace or test.

## Install

Run from this repository only after the package has passed review:

```bash
python ops/mcp/install-builder-tools.py \
  --target /home/jbai/minecraft/praya/mcp
```

The installer atomically copies the module and adds one idempotent
`import tools_builder` after `tools_admin` in `server.py`. It deliberately does
not start or restart the MCP service. A service restart is a separate operator
action after deployment review.

## Verify

```bash
venv/bin/python -m pytest tests/test_builder_mcp_tools.py -q -p no:cacheprovider
```

To exercise registration against an installed Praya FastMCP runtime without
contacting Minecraft or the Builder service:

```bash
PRAYA_MCP_PYTHON=/home/jbai/minecraft/praya/mcp/venv/bin/python \
PRAYA_MCP_HOST_DIR=/home/jbai/minecraft/praya/mcp \
venv/bin/python -m pytest tests/test_builder_mcp_tools.py -q -p no:cacheprovider
```



Pass `include_parts=true` to `builder_context` when a design agent needs the exact
compiler-validated part definitions and parameter contracts. Write authors must
include `agent` and `model`; `effort` and `note` are optional. Saving records the
accepting actor as `savedBy` and preserves the design's original `author`.
