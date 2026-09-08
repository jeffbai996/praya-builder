# Map selection, survey capture and placement

The live map uses BlueMap. Studio is a separate authoring service; map tiles are
visual context, not a substitute for a current survey of actual blocks.

## Working path

1. Choose **Select a plot** on BlueMap and click opposite corners. The outline
   follows the map camera. **Design selected plot** opens studio with those exact
   integer bounds. **Design here** also supports the map center. Camera Y is not ground level.
2. Name the plot, choose its width/depth, and set the bottom Y and capture height.
   Mark the street entrance and protected areas in the plot plan, then save.
   This record survives reload, but is not yet a block survey.
3. If the updated adapter serves that world and reserved area, choose **Capture
   surroundings**. Progress includes a complete verification pass; cancellation
   publishes no partial survey. **Open verified survey** loads the result. For
   the isolated trial, **Use connected capture area** selects its reserved bounds.
   Otherwise expand **Import a WorldEdit capture instead** and use the four
   **Copy command** buttons in order. WorldEdit
   selects the corners, copies the volume and saves a Sponge schematic. Retrieve
   it from `plugins/WorldEdit/schematics/` and upload it under that saved selection.
   Enter the actual capture time. These commands do not paste into the world.
4. Studio verifies the schematic and its dimensions, binds it to the selected
   origin/world, then allows proposal development. An existing survey can also be
   imported with labeled position, frontage and protected-area fields.
5. Save an accepted revision. **Export saved placement package** downloads its
   exact artifact, survey fingerprint, transform, world and explicit write mask.
   The package requires placement review; downloading it does not run a job.
6. The configured isolated bridge supports preview, reviewed placement, pause,
   readback and conflict-aware undo. Walk through the finished result in game.

The first real Praya plot has now been captured through the updated read-only
adapter. Studio retains its separate isolated construction connection. Direct
Praya placement is still pending design review and a bounded construction trial;
the map handoff never grants placement authority.

## Configuration and adapter contract

Set `BUILDER_MAP_URL`, `BUILDER_MAP_ID` and `BUILDER_MAP_WORLD` on the studio service.
The URL parser accepts only the configured map origin/path and map ID. It reads
the BlueMap anchor's X/Z values without making an arbitrary server-side request.

Install the map handoff with:

```sh
python3 tools/install-bluemap-studio.py /path/to/server https://builder.example/studio
```

The installer preserves existing scripts, snapshots affected files once and
updates BlueMap's webapp configuration plus current settings file. Reload the
map page. No game restart or world modification is required. BlueMap documents
this extension point in its [custom scripts guide](https://bluemap.bluecolored.de/community/Customisation.html).

| Route under `/api/workspace/` | Purpose |
| --- | --- |
| `GET integration` | Map configuration, capture mode, durable selections and capture history |
| `POST map-location` | Validate a BlueMap URL and return integer X/Z |
| `POST selections` | Save name, center X/Z, base Y, dimensions, optional context margin, frontage and protected boxes |
| `GET selections/{id}` | Retrieve the selection and WorldEdit capture guide |
| `POST selections/{id}/import` | Validate base64 schematic and capture time against selection bounds |
| `GET capture/status` | Connected world identity, bounds and survey capability |
| `POST capture/selection` | Select the connected reserved capture area |
| `POST selections/{id}/capture` | Start a bounded capture and verification job |
| `GET captures/{id}` | Durable progress, result and completed survey ID |
| `POST captures/{id}/cancel` | Cancel without publishing a partial survey |
| `GET revisions/{id}/handoff` | Export an exact saved placement package |

Writes use `X-Builder-Write: 1`; no studio login is required. External agents and
future capture adapters use these same operations. `capture-selection.cjs` provides
the CLI survey upload path: `node preview/capture-selection.cjs <id> <file.schem>`.

Limits remain 128 blocks per survey axis, 262,144 survey cells, an 8 MiB schematic,
and 10,000 compiled write cells. Protected-area edits, terrain clearance and
rotation still follow the existing site assessment and construction checks.

## Next integration work

The [next-run implementation brief](next-builder-run.md) defines the capture and
Praya placement slice, its existing entry points and acceptance gates. Run
`node preview/next-run-readiness.cjs` for a read-only live readiness report.

- Bounded automatic capture is implemented in both the isolated test world and
  the first real Praya parcel. The Praya connection advertises read-only capability.
- Develop a bespoke plan for the first narrow parcel; the fixed apartment-study
  template requires 32 by 32 buildable blocks and is disabled on smaller plots.
- Complete real design/placement/player-walkthrough acceptance.
- Publish accepted footprints and observed construction status back to BlueMap.
- Later, let a simplified gp-ai consume accepted buildings and places as citizen
  simulation context. No citizen or municipal-service changes are part of this release.
