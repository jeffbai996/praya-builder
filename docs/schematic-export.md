# Export a builder proposal

Implemented in workspace build **20260905.05**. All nine projects and seventeen
revisions have browser downloads. No Minecraft connection, Java process or model
request is needed to download an already compiled proposal.

## Review → download → test

1. Select the project and revision. Inspect its exterior, drawing layers and
   components. **Focus component**, **Fit model**, **Expand view**, studio/warm
   lighting and the grid toggle help inspect the exact compiled geometry.
2. Choose **Export schematic**. Confirm the revision, fingerprint and dimensions.
   **Download .schem** saves the full proposal, including its authored site—not
   only the visible cutaway or selected component.
3. Also download **Source manifest**. It preserves the original artifact,
   component ownership, dimensions, hash, format version and placement semantics.
   Review notes are separate: **Export review JSON** retains those browser-local
   observations. **Save view** captures the current camera as a PNG.
4. Use an empty, disposable test plot before placing anything in the city.

For Paper, WorldEdit's default directory is `plugins/WorldEdit/schematics/`;
for mod installations it is `config/worldedit/schematics/`. Copy the downloaded
file into the appropriate folder. Load its exact filename, then inspect the
destination selection without placing blocks:

```text
//schem load <downloaded-filename.schem>
//paste -n
```

After checking the bounds in the test world, `//paste` performs the placement.
Builder uses the minimum X/Y/Z corner as origin: the site extends toward positive
X and Z, with Y=0 at the authored site's bottom. Do not use `-o` to infer a surveyed
location; these proposals have no world coordinates. WorldEdit documents the
folder conventions, load command and selection-only paste flag in its
[clipboard guide](https://worldedit.enginehub.org/en/latest/usage/clipboard/).

**Air matters.** Sponge schematics describe a rectangular volume. Unspecified
cells become air, including space around irregular footprints. A normal paste
can clear or replace that entire volume. WorldEdit's `-a` flag skips all air,
including intentional interior clearing; it is not an ownership-aware placement
mode. Keep the source manifest and never infer a protected plot from the rectangle.

## Format and fidelity

The writer implements [Sponge schematic v3](https://github.com/SpongePowered/Schematic-Specification/blob/master/versions/schematic-3.md):
gzip-compressed big-endian NBT, an unnamed root containing `Schematic`, a block-state
palette, X-fastest varint cell data and offset `[0,0,0]`. DataVersion **4189**
accurately identifies the renderer's Minecraft **1.21.4** block registry rather
than claiming newer source data. All seventeen downloads were read directly by
WorldEdit **7.4.0** on Paper **1.21.11**, with every cell checked against the source.

Authored block states, slab/stair orientation, panes and decorative furniture are
included. Entities, biome data, inventories and sign text are not. Block entities
use game defaults; a decorative appliance is not a configured functional system.
File readback does not establish in-game physics, player circulation, lighting,
resource-pack appearance or architectural acceptance. Those remain visual/play tests.

The viewer's half-texel atlas inset eliminates neighboring-texture seam bleed in
models and material thumbnails. It affects only texture sampling, never block
coordinates, states, artifact hashes or exports. Studio and warm lighting are
study modes, not Minecraft shaders.

## Download contract

```text
GET /api/schematic/<project>/<revision>?hash=<full-artifact-hash>
GET /api/export-manifest/<project>/<revision>?hash=<full-artifact-hash>
```

Only loaded catalogue revisions are admitted. A missing/duplicate hash or extra
query parameter returns 400; a stale hash returns 409; an unknown revision returns
404. Successful responses carry `X-Artifact-Hash` and an attachment filename
containing project, revision and hash prefix. The browser checks the response hash,
keeps the selected identity visible and supports retry after download failure.
The schematic payload is already gzipped, so HTTP compression is not applied again.

Export validates the source hash, dimensions, cell budget, coordinates, uniqueness
and registry states before allocating the bounded volume. It uses `prismarine-nbt`
and `minecraft-data` already present in the pinned preview dependency tree; no new
dependency was installed. Responses are generated in memory and do not overwrite
server files or modify the world.

## Reproduce verification

Run `venv/bin/python -m pytest tests/test_schematic_export.py -q` from the repository
root. A Python reader independent of the JavaScript writer checks all cells,
implicit air, dimensions, metadata, deterministic output and multi-byte varints.

With the preview running and an existing Playwright/Chromium installation:

```bash
node preview/check-export-tools.cjs
```

This exercises actual downloads, manifest identity, full-height export from a
cutaway, stale/invalid requests, retry, component focus, fit, expanded view,
lighting/grid controls and mobile layout. Set `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`
and optionally `PREVIEW_TEST_URL` as described in the preview README.

For independent WorldEdit readback, prepare a new ignored or temporary output
directory and download the real HTTP bytes:

```bash
node preview/check-export-fixtures.cjs /path/to/new-test-exports
./gradlew build smokeTestJar
```

In an EULA-approved, disposable, loopback-only Paper 1.21.11 server, install
WorldEdit 7.4.0 and both freshly built plugin JARs. Set `BUILDER_SMOKE_TEST=1` and
`BUILDER_SCHEMATIC_DIR` to the absolute fixture directory before starting it.
The probe reads the Node-produced files directly, compares the full volume and
origin, logs `BROWSER_SCHEMATICS_PASS count=17` and `BUILDER_SMOKE_PASS`, then shuts
down. No schematic is pasted into a world. An empty fixture directory fails the
probe; a zero process exit code is not proof of success. Never install the smoke
plugin in a normal server.
