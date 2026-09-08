# Studio sweep 2 — scope

Prepared 2026-09-08 after commit b223fac (drawing-first modes, versions, calmer copy). Each item is sized for one autonomous run with browser checks. Nothing here touches the live Praya world.

## Housekeeping first

**H1. Commit the pre-existing uncommitted work in logical pieces.** Sign bridge (SignData.java, TestWorldBridge, PlanCompiler, construction-service, schematic, mesh, docs/sign-bridge.md, check-paper-signs / check-sign-construction / check-signs-beds), canon (AGENTS.md, docs/praya/, canon notes, reference images, building-style.md), models (old-town-corner-stores plans, special-block-models.cjs), README. Read each before committing; do not bundle.

## Tier 1 — small, certain, worth doing

**S1. Mesh cache for floor switching.** Cache meshes in the browser by candidate hash + ceiling so cutaway changes are instant after the first fetch, and show the previous model under a light "Compiling…" veil instead of a pop. Acceptance: second switch to a floor makes no network request; the camera never moves.

**S2. Dynamic floor list.** Derive cutaway options from the candidate (space levels, or slab rows if spaces are absent) instead of the fixed 6/11/16 set, labelled Ground / First / Second / Roof. Acceptance: a two-storey design shows two floors; the corner-stores draft shows its real levels; `mesh?ceiling=` values still validate.

**S3. Rename a design without touching identity.** Rename edits `plan.name` through the existing edit route, which already refuses `plan_id` / `revision` changes. Show the new name in the selector, the version list and exports. Acceptance: a renamed draft keeps its versions, parent hash and compare baselines.

**S4. Studio camera and lighting parity with the catalogue.** Add the Street camera, the Studio/Warm lighting select and grid toggle (scene.js already implements all three), plus keyboard shortcuts 1–6 for cameras, F fit, E expand, and a small "?" sheet like the catalogue's. Acceptance: same five-plus-one cameras on both pages; check-design-navigation extended.

**S5. Asset support states.** Server reports what each special block type supports (preview / schematic / bridge placement) from the existing sign and bed checks; Studio shows a short badge per affected component under Details and in the export confirmation. Copy must not claim world placement for heads. Acceptance: signs show "preview · export · isolated bridge", custom heads show "preview only", nothing claims more than the checks prove.

## Tier 2 — medium, still one run each

**M1. Sign presets from docs/praya/sign-formats.md.** In Adjust, for a selected sign-bearing component: choose Centered notice, Framed notice, Address plaque, Bilingual street sign; type the text; presets only decide composition (centering rule, framing and blank rows, line order). No default text, no generated addresses or translations. Live preview on the 3D sign canvas, written through the edit route so undo/redo and versions apply. Prerequisite check: confirm PlanCompiler's sign operation accepts per-line text edits. Acceptance: check-sign-construction still passes; a preset with blank fields does not compile placeholder text.

**M2. Reference tray.** Per-draft references: drop or paste screenshots (PNG/JPEG, 8 MiB cap) and source notes; stored under the workspace as bounded files, listed as a strip under the model with a lightbox. Included in the revision request export so an agent sees the same references. Acceptance: upload refuses other types and oversize; survives reload; request file references them by hash.

**M3. Server-rendered version thumbnails.** Reuse thumbnails.cjs and thumbnail-render.html to render saved workspace revisions, replacing the browser-local capture so the version list is complete on any device. Acceptance: every saved version shows an image after one render pass; a failed render shows the V-number tile, not a broken image.

**M4. Site mode as steps.** The map/capture form is still the longest surface in the app. Reshape into three collapsed steps (Choose plot → Capture surroundings → Import/confirm) with the completed state summarised in one line, test plots under "Try a test plot". Preserve every existing id; check-studio-map and check-studio-capture define the contract. Acceptance: both checks pass unchanged apart from summary clicks.

## Explicitly not this sweep

- **Interior fit-out entry point.** docs/praya/interior-fitout.md lists open dependencies (existing-building survey, indoor space reading, bounded room jobs). A disabled button would be noise. Revisit when the survey side exists.
- **Custom-head library.** Requires in-world inspection of the Oakville City Hall collection and identifying the head plugin. Not a UI task.
- **Anything against the production server.** Placement checks stay on the disposable bridge, opt-in only.

## Suggested run order

H1 → S1 → S2 → S3 → S4 → S5, then M1 and M2 if the sign-text prerequisite holds; M3 and M4 as stretch. Validate each at 320, 390, 768, 1024, 1440 in light/dark/OLED; run check-studio-polish, check-design-navigation, check-header-controls, check-browser, check-export-tools on the live server and check-studio, check-studio-release, check-studio-map on a scratch workspace with BUILDER_MAP_URL set.

## Status — 2026-09-08, sweep 2 implemented

H1 committed as three pieces (signs f2c3b59, plans 3e29d6e, canon 80aa4ed); docs/reference-images (73 MB of screenshots) intentionally left out of git pending a decision on binary assets. S1–S5 landed in bdf54e9 and a5fe66f; M1 in a5fe66f; M3 in 2772867; M4 and M2 in 859e655 / a08a27f (the studio.js hunks for both landed in the first of those two).

- S1 mesh cache: `draftMesh()` keeps eight meshes by candidate hash + ceiling; a "Working…" veil sits over the previous model while compiles run.
- S2 floors: `floorOptions()` merges space levels with slab rows found by block density, cut two blocks above each level. Studies still yield 6/11/16; the corner stores read Ground / First / Second / Roof level.
- S3 rename: `plan.name` only, through the edit route. Versions, parent hash and compare baselines unchanged.
- S4 parity: Street camera, Studio/Warm light, Grid chip, keys 1–6 / F / E / ?, help sheet.
- S5 support: `preview/asset-support.cjs` + `GET drafts/{id}/support`; badges under Details, bridge placement only claimed with a sign-capable bridge.
- M1 sign presets: `preview/sign-presets.js` (custom, centered, framed, identity, plaque, bilingual street); blank fields cannot compile; edits go through the edit route so undo/redo and versions apply.
- M2 references: `POST/GET drafts/{id}/references`, `GET references/{draft}/{file}`, PNG/JPEG ≤ 8 MiB, 24 per draft, magic-byte checked; the revision request lists them by sha256 and path.
- M3 thumbnails: `GET artifacts/{hash}/mesh`, `GET/POST revisions/{id}/thumbnail`; the browser renders a missing one once and stores it.
- M4 site steps: 1 · Choose a plot / 2 · Capture surroundings / 3 · Propose a building; test plots behind a disclosure that opens only when no site exists.

Checks: check-asset-support, check-sign-presets (node:test); check-studio-polish (read-only on live, `BUILDER_POLISH_WRITE=1` on a scratch server adds rename, sign edit and references); check-studio, check-studio-map, check-design-navigation, check-header-controls pass.

Next candidates: commit or LFS the reference images; a per-component "Signs" summary in the catalogue; a small Site-mode empty state on phones; render thumbnails for catalogue projects through the same route so the register and Studio share one pipeline.
