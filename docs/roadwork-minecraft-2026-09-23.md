# Roadwork: Minecraft corridor implementation

This implementation replaces the presentation-only transport study with a survey-bound, deterministic road proposal. The app is **Roadwork**, under the Transport Department. Templates and generated alignments are proposals, not Praya standards.

User interface direction, September 23: Roadwork is a standalone application, comparable to Builder, with its own transport visual language. Department affiliation is secondary to the product name. Do not reuse the public GOV.PRAYA banner, government-site navigation or department masthead; retain transport character through the palette, road icon, typography and drawing tools.

## Data path

Roadwork reads the existing workspace's saved block surveys. A user reviews or corrects world-space road points, selects a width and alternative, and generates bounded segment artifacts. Plan, profile, section and block preview derive from the returned assembly. Saving pins the input, survey snapshot, assembly and child artifact hashes in an immutable study under `.workspace/roadwork/`.

October 1: [the terrain/slab implementation](municipal-register-2026-10-01.md) adds a fourth terrain-fit alternative, explainable ranking, a four-wide compact section and shaped slab/stair views. The following describes the original September baseline.

The initial alternatives are deterministic geometric variations: follow the control points, apply a modest bend, or straighten intermediate points. They are not yet terrain-optimized or ranked designs. Widths are odd integers from 3 through 15 blocks. The initial palette is provisional gray/white concrete and stone edging/subgrade. The 3D view renders block occupancy with simplified cubes; slab, stair and other non-cube collision shapes are not reproduced.

The built-in fixture exercises bends, changes in elevation and multiple segments. Its source is explicitly a test fixture. It does not establish surveyed Praya geometry or in-game validation. Imported and captured surveys retain their source, world, origin and capture date.

## Contracts

- Surveys use the existing site format: local block coordinates, world-space origin and protected boxes, complete coverage and source metadata. Uncovered space is unknown.
- Input route points use world X/Y/Z. Y identifies the road surface block. Template width is a provisional design parameter.
- The deterministic engine owns road sampling, block generation, segmentation, metrics and review issues. It does not invoke a language model or write to Minecraft.
- Each segment has a world origin and an exporter-compatible, hashed block artifact. Segment ownership must be disjoint. Ports describe world-space connections.
- The assembly carries exact world-space changes separately from its exported rectangular snapshots. The manifest pins all child hashes and origins.
- Saved studies snapshot their source survey; reopening does not substitute a newer survey or regenerate against changed defaults.
- Export requires the exact saved assembly hash and successful review. Sponge schematics are rectangular snapshots, not sparse change masks. Construction must use the explicit changes with source-state checks.
- The new API is `/api/roadwork/`. Writes require the existing `X-Builder-Write: 1` convention and allowed origin. Records are bounded and integrity checked on read.

## Existing code and ownership

`preview/roadwork-engine.cjs` contains generation and validation. `roadwork-api.cjs` owns transport studies without modifying Builder's draft/revision records. `transport.html`, `transport.css`, `transport.js` and `roadwork-view.js` own the transport interface. `server.cjs` serves those routes alongside Builder. Existing survey capture remains available through Studio.

## In-game milestone

The user authorized building Roadwork on September 23. A specific road trial area still needs to be chosen before placement. The September 23 console recovery record also leaves a separate four-parcel Builder trial awaiting coordinates; that is not a Roadwork placement area.

For a chosen Sandbox corridor: capture the actual road and terrain; correct the inferred alignment; save a selected alternative; check the exported assembly; re-read affected blocks before applying; verify the result and segment joins; then walk or drive the route using the server's actual mechanics. Compilation, browser tests and schematic round trips cannot establish successful traversal.

Live placement remains outside this implementation. The Oakville sign-head inventory, sign meanings/profile identifiers, vehicle mechanics, bridges, portals and intersections remain separate follow-up work. Do not claim sign compliance or road engineering quality solely from the provisional surface template.

## Verification

Run `node --test preview/check-roadwork-engine.cjs preview/check-roadwork-api.cjs` for deterministic geometry and API persistence/export checks. Browser verification uses `preview/check-transport-studio.cjs` against the updated application. Keep generated evidence and test workspace data out of source control.

September 23 engine/API checks passed for deterministic generation, disjoint segment envelopes, matching connections, exact Sponge palette round trips, preservation of unchanged context, unknown survey/protected-area rejection, unsupported fill/fluid conflicts, stale review hashes, immutable survey snapshots and saved-record integrity. The existing capture, construction and map-integration suites also passed all 23 tests.

September 28 checkpoint: engine/API checks passed again. The complete browser workflow passed in an isolated workspace: generate alternatives, reject fractional coordinates, save/reopen, reject stale exports, download the manifest and both schematics, show the block model, and reopen the saved fixture at 320 pixels without page overflow. The mobile check now reopens its own saved fixture rather than depending on a live survey; a minimum-width issue in the review grid was fixed. These remain application checks, not an in-game road trial.

Two isolated Node 20 measurements, not a sustained performance profile: the bounded fixture compiled in approximately 10 ms with two segments; a proposal against the existing saved Sandbox building survey compiled in approximately 21 ms with two segments, 388 changes and 1,143 export cells. That real-survey proposal correctly failed readiness because it overlaps protected cells and protected export context. It is evidence of survey binding and rejection, not an accepted road design. No world placement or in-game traversal was performed in these checks.
