# Browser design review

Current checkpoint, 2026-09-05: nine projects/seventeen revisions, direct browser
schematic export, source manifests, focused/expanded inspection and corrected
texture seams are implemented. See [export workflow](schematic-export.md) and
[verification](verification.md). The first-delivery description below is historical.

Status: first review implemented, 2026-09-04. A compact six-unit apartment and its first revision are available in a loopback-only browser viewer. Run it with the [preview instructions](../preview/README.md). The requirements below retain the broader review scope; the delivery record distinguishes implemented behavior from remaining work.

## First delivery

Subsequent delivery: R2 adds a modern facade/roof treatment while preserving R0/R1 artifacts and internal layouts. Private tailnet HTTPS access is configured through a separate Tailscale Serve listener, with an exact origin supplied at runtime. See [current setup](../preview/README.md) and [verification](verification.md). The R1 record below remains historical.

Implemented: deterministic compiled artifacts, locally served Prismarine block-model meshes, five camera presets (perspective/front/side/roof/street), orbit/pan/zoom, keyboard controls, floor cutaways, component picking/outline, camera-preserving R0/R1 comparison, cell-state diff overlays, PNG download, artifact identity, and explicit failed-load handling. A full 5,004-cell R1 artifact was exported and read back through isolated Paper/WorldEdit. No schematic import is required to review it.

The showcase uses a synthetic 32 × 32 site, three residential floors, six units, and a roof terrace. R1 changes 116 positions: 88 added, 12 replaced, and 16 removed. This is an authored proposal, not user-approved canon or a reconstruction of an existing building.

Not delivered: rear preset, free-flight walkthrough, resource-pack import, presentation-lighting switch, surveyed neighbors/terrain, persisted design approval, arbitrary revision lists, in-game visual comparison, upper-bound performance certification, or world editing. Windows loopback HTTP reachability was verified; served-page visual/interaction checks ran in Linux Chromium with software rendering.

## Review loop

```text
Versioned building plan
          |
     Plan compiler
          |
Compiled cells + states + owners + hash
          |                         |
    Browser preview          Schematic exporter
          |                  (approved revision)
   Review / revise                  |
          |                  Isolated game check
     New revision
```

The preview and schematic consume the same immutable compiled artifact. Do not implement a second geometry generator in the browser or use a generated concept image as evidence of what will be built. Review iterations update preview data, without model calls triggered by loading the page and without requiring a Minecraft server or schematic import for each iteration.

Automated schematic round-trip tests still run at engineering gates. The user-facing review loop does not require repeated manual export/paste cycles. Final in-game inspection remains necessary for collision, game behavior, resource-pack appearance and shader fidelity.

## Review requirements

- Serve a small read-only site locally on the development PC, bound to loopback. Verify that the user's desktop browser can reach it; do not assume that a working WSL listener is proof of Windows browser access. Any later cross-machine serving needs an explicitly configured private route.
- Load a bounded, versioned compiled artifact from the served preview directory. Show plan/revision/hash, dimensions, block count and renderer-fidelity warnings.
- Orbit, pan, zoom and reset the camera; provide front, rear, side, roof and street-height presets. Free-flight walkthrough is later work.
- Hide the roof or clip above a selected floor to inspect rooms and stairs. This is a display operation, never a change to the plan.
- Highlight a selected component and identify its name/block state. User feedback can name a specific facade or entrance rather than an ambiguous screen location.
- Switch between current and previous revisions at the same camera position. Highlight additions/removals/changes, including explicit-air edits.
- Export a PNG of the current view with revision attribution. Maintain camera state while loading a newer revision; never silently mark it as the already-reviewed revision.
- Show the frontage, approach path and a bounded site context. Clearly distinguish contextual terrain/neighbors from cells owned by the proposal.

Initial interface: a large model viewport, compact revision/diagnostic panel and a short row of view/layer controls. No chat product, user-account system, world-write button or browser-based block editor is needed for the first viewer. Feedback can remain in the existing conversation.

## Renderer choice and fidelity

Selected implementation: Prismarine Viewer 1.33.0's existing section mesher and model assets, wrapped in a small native-JavaScript review interface. Dependencies were approved and installed with a lockfile; assets are served locally with no page-load CDN request. A narrow variant-selection adapter fixes the pinned library's mistaken air/stair name match. No full SPA framework or independent fallback renderer was added.

If that spike fails the required palette or review controls, a small Three.js renderer is the fallback, with an explicitly limited shape set. Three.js documents building voxel meshes with hidden interior faces omitted, rather than creating an object for every cube. That is a useful starting point, not a Minecraft block-state renderer. Do not implement both paths simultaneously. [Three.js voxel geometry](https://threejs.org/manual/en/voxel-geometry.html)

Use two explicitly labeled review levels:

1. **Massing/material study:** correct block locations and dimensions, neutral approximate material colors, basic lighting. Suitable for footprint and volume discussion, not approval of fine details.
2. **Supported block-detail preview:** state-aware shapes for the selected building palette, including its slabs, stairs, panes, doors and other non-full blocks. Verify orientation, half/shape properties, transparency and neighboring connections against fixtures. Unsupported shapes must be conspicuously highlighted and listed, never silently rendered as plausible full cubes.

A render can only claim geometry fidelity for its tested block/state subset. Directional and connected geometry must come from explicit states and relevant neighbor context, not a color lookup based only on the base block name. Do not cull faces against transparent/partial blocks as though they fully occlude a neighboring cube. Floor clipping also needs newly exposed internal faces to remain visible.

Keep neutral daylight as the comparison default. An optional presentation-lighting preset may help review, but is not a reproduction of the user's Minecraft shaders. If matching local textures/resource packs is later requested, keep imported assets local and out of the public repository; record the pack/version used. The first release does not need to ship game textures.

Prismarine Viewer supports standalone/in-memory world viewing without requiring a bot. Its current README lists explicit model/texture versions through 1.21.4 and describes using the closest supported models for other releases of the same major version. This plugin targets 1.21.11: verify state-ID mapping and the apartment's actual palette before accepting fallback models as accurate. A successful connection alone is insufficient. [Prismarine Viewer](https://github.com/PrismarineJS/prismarine-viewer)

## Input and authority boundaries

- Render compiled cells, not arbitrary scripts, external asset URLs or executable plan expressions.
- Validate format, dimensions, cell counts and input size on load. Cap mesh work, image sizes and allocations as well as source-file size.
- Render names/diagnostics as text. Reference images and private coordinates are not bundled into public demo data.
- The browser is read-only. Design sign-off identifies the reviewed immutable artifact; it does not authorize live-world edits or bypass server validation.
- Approval of a massing view must not be represented as approval of unreviewed block details. A changed plan/hash invalidates prior revision approval.
- Failure to render or load a new revision leaves an explicit error, not an apparently current image of the previous design.

## Original implementation sequence and test gates

1. Compiler emits a stable preview artifact and a small generic fixture. Preserve the existing legacy-grid tests.
2. Run the renderer compatibility spike against cube, slab, stair, pane and door fixtures; then add the locally served viewer, camera controls and revision identity. Any cube-only fallback must be labeled massing mode.
3. Test and add the actual compact apartment's block shapes; implement floor clipping and component picking.
4. Add fixed-camera revision comparison and PNG export. Review the apartment before authoring/exporting the approved schematic.
5. Verify the selected revision in the isolated game environment; compare the same views, then address observed differences.

Tests before implementation: malformed/oversized artifacts, coordinate handedness and Y-up alignment, repeatable block-to-mesh mapping, stair/slab orientations, transparent/partial-block boundaries, component selection, clipping, stale revision/error handling and hash identity across preview/export. Unsupported blocks must be visible in diagnostics.

Because this creates an interactive browser surface, verify the served page in a real browser: camera controls, viewport resizing, keyboard-accessible controls, layer toggles, revision switching, loading failures, component picking and downloaded PNG contents. Measure mesh-build time and orbit responsiveness for the fixture and the configured upper bound, and report the test environment. Do not infer performance from the library's existence.

Exit gate: the user can open the page on their PC, inspect the apartment proposal and its interior, compare a revision and view/download rendered images without making or pasting a schematic. The exported schematic must subsequently match the reviewed compiled revision.

The first review and schematic round-trip gates are implemented. Player usability, final game appearance, and architectural acceptance remain separate checks; see [verification](verification.md).
