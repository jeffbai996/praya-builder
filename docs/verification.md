# Verification

## Studio interface and map foundation — build 20260906.03

Verified on 2026-09-06:

- Build number restored below the studio wordmark. Raw metadata entry and JSON
  records replaced by labeled forms, a finish selector, review metrics and readable
  placement records; exact technical artifacts remain available as downloads.
- Three map contract tests pass for configured-map validation, negative positions,
  bounded selections and immutable placement-package binding. The existing site,
  draft, construction and apartment wrapper tests pass (2 pytest, 6.45 seconds).
- Served map workflow passes durable selection/reload, WorldEdit capture guidance,
  exact survey import, rejected malformed input and mobile layout.
- Served authoring passes scoped edits, history, save/reload, placement-package
  download and all themes. Production smoke passes the three preserved candidates.
- A live BlueMap browser click opens the production studio with map X/Z populated
  and ground height left for confirmation. The BlueMap custom script is installed;
  no game-world blocks were written. Desktop rendering was inspected.

Production-world automatic capture, placement and map footprint publication remain
adapter work. See [the connection contract](praya-map-connection.md).

## Direct studio access — build 20260906.02

Verified on 2026-09-06:

- Removed studio operator keys, session endpoint/cookies, unlock UI, CLI bearer
  setup and obsolete production/local key files. The separate Paper service
  connection remains configured.
- The new access assertion first failed against the previous server (401 instead
  of 200), then passed against the updated service. Browser and CLI reads/writes
  require no credentials; the retired session endpoint returns 404. Unexpected
  origins and writes missing the custom request header still return 403.
- Served authoring passed three proposals, scoped geometry preservation,
  undo/redo, roof variants, save/reload, all themes and 390px layout in an isolated
  store. No operator token was created.
- Production smoke passed all three existing candidates with a fresh browser
  context and no cookies. The heading is lowercase `studio` with `0.03em` letter
  spacing; desktop rendering was inspected and OLED/mobile layout passed.
- Windows HTTPS access to the production context returned 200 without credentials.
  Production drafts and surveys were preserved. No game-world writes were needed
  for this change.
- The existing served workspace-shell regression suite also passed.

## Site-aware studio and isolated placement — build 20260906.01

Verified on 2026-09-06:

- **176 pytest tests passed in 45.23 seconds.** The new pytest wrappers include
  17 Node behavior cases for bounded imports, state-aware rotation, exclusions,
  immutable records, quota failure, invalid/stale edits, history, deterministic
  studies, roof variants, job recovery and conflict-aware rollback.
- All eight existing served browser suites passed. The original nine-project,
  nineteen-revision catalogue and its exports remain intact.
- The studio browser suite passed import/fixture creation, three alternatives,
  scoped material preservation, roof treatment, undo/redo, saved revision reload,
  authentication, rejected cross-origin writes, themes and 390px layout. Exterior
  views and floor cutaways were inspected. Release smoke verified three clean
  candidates on the actual production listener.
- All three apartment arrangements compile identically on repeated runs on flat
  and sloping sites. Walking-grid checks reach all twelve apartment/bathroom doors
  from the street in each fixture. This is a conservative geometry model, not an
  actual player walkthrough.
- Actual isolated Paper 1.21.11 / WorldEdit 7.4.0 construction applied **5,617
  changed cells in 44 batches**, then verified every intended state. Batch p95
  was **6.782 ms**, maximum **9.111 ms**, including WorldEdit flush. The 4 ms
  submission target is cooperative and is not a hard tick-time guarantee.
- Conflict-aware rollback restored **5,616 cells** while preserving one deliberate
  later edit. The test then restored that test-owned edit separately and checked
  the original states. An earlier repeated fixture caught grass-to-dirt changes
  from game random ticks; the disposable fixture now explicitly freezes random
  ticks for reproducibility. Normal gameplay is not made static by the bridge.
- The actual served construction UI passed preview, apply, pause, reconcile,
  resume, observed completion and rollback for the full 5,617-cell trial.
- A separate Windows HTTPS client verified release 20260906.01, session-key
  authentication, one seeded survey, three clean draft candidates and the live
  isolated bridge. Served browser tests used loopback; this HTTPS check is separate
  network/authentication evidence.

The production workspace contains clean synthetic candidates, not the repeated
QA drafts or test-job history. Its records and key live in ignored
`preview/.workspace`; the isolated world remains a separate disposable runtime.
The current preview and test server are detached processes, not boot services.
No new dependencies, paid inference, production-world edits, commits or pushes
were performed. **Real-world extract selection and an actual player walkthrough
remain outstanding acceptance steps.** Whole-neighborhood generation and in-app
model calls remain future stages. See [the implemented workflow](site-design-workflow.md).

## Department workspace and complete elevations — build 20260905.06

Verified on 2026-09-05:

- **174 pytest tests passed in 36.17 seconds.** The new design checks exercise
  both side/rear improvements, studio bathroom fixtures/access, all six shared
  landings, garden/gallery terrace access, budgets and unchanged parent hashes.
  The independent Python schematic decoder also covers the two new volumes.
- All seventeen previous compiled artifacts and their authored plan files
  remained byte-for-byte unchanged after compiling the nineteen-revision catalogue.
- Rosedale R2: **7,948 cells**, hash
  `ebf62f62e1c14af29fe255c230e97ed9898499793ff14940af46ec93832e11c9`.
  Frame House R1: **8,006 cells**, hash
  `8bc9964b47422bd4fd7443ebfc23707d0a765bd42ccf16c7fa72a40c641ac9c9`.
- Served-page checks cover actual revision PNGs, image identity/framing, lazy
  loading, no extra register mesh requests, private caching/304, malformed/stale
  routes, missing-image retry, filters, sorting, Records view, theme persistence,
  OLED surfaces and a black WebGL background. Desktop, tablet and mobile layouts
  and the two designs' side/rear/floor views were inspected.
- All eight browser suites passed: base preview, department workspace, design
  catalogue, material icons, export tools, register thumbnails, workspace shell
  and complete elevations. Register and workspace-shell acceptance also passed
  against the deployed listener. A separate HTTPS client confirmed build .06,
  nine projects/nineteen revisions, and both new PNG/schematic downloads with
  matching artifact headers. The browser suites used loopback, not remote HTTPS.
- Nine current register PNGs total **1,801,699 bytes**. Seven were reused when
  the two successor designs were added. Image generation uses a single serial
  offscreen renderer; the register loads static images without rendering models.
- The two new actual HTTP schematic downloads succeeded and are tied to their
  full artifact hashes. Same-camera parent/successor switching was verified.
  The earlier WorldEdit/Paper readback remains evidence for the original
  seventeen artifacts; it has **not** been rerun for these two successors.

The architectural pass covers Rosedale and Frame House first. Other catalogue
buildings remain unchanged. Route checks are voxel heuristics, not player-physics
or code certification. No new dependency installation, paid inference, live-world
connection, placement, commit or push was involved. Map surveys and parcel GIS
remain future functionality; the current UI uses authored site envelopes.


## Browser schematic export and inspection — build 20260905.05

Verified on 2026-09-05:

- **166 pytest tests passed**, plus Gradle `build smokeTestJar`. The 24 new
  regressions cover seventeen deterministic full-volume exports, invalid source
  hash/bounds/coordinates/duplicate cells/states, multi-byte palette varints and
  texture UVs staying inside their atlas tile. The Python NBT decoder is independent
  of the JavaScript writer.
- **HTTP_SCHEMATICS_PASS count=17**, **BROWSER_SCHEMATICS_PASS count=17** and
  **BUILDER_SMOKE_PASS**. Actual browser-route `.schem` payloads were read directly
  by WorldEdit 7.4.0 on isolated Paper 1.21.11 build 132 / Java 21. Dimensions,
  zero origin and every volume cell—including implicit air—matched the compiled
  artifact after registry normalization. Files were not re-exported through Java
  before reading. The test server shut down; no schematics were pasted.
- **BROWSER_PASS**, **DEPARTMENT_BROWSER_PASS**, **NEW_DESIGNS_BROWSER_PASS**,
  **MATERIAL_ICONS_BROWSER_PASS** and **EXPORT_TOOLS_BROWSER_PASS**. Served Chromium
  checks covered downloads, source-manifest identity, full export while cut away,
  invalid/stale requests, retry, component focus, fit, expanded mode/Escape,
  lighting/grid, review export, existing revision interactions, themes and mobile
  overflow. Light/dark, interior and export views were visually inspected.
- A separate tailnet device downloaded the mansion schematic through the existing
  HTTPS proxy. Its bytes exactly matched the local exporter; NBT identified the
  expected hash and 44 × 24 × 40 dimensions. WSL Chromium could not connect to its
  host's own tailnet HTTPS origin, so browser acceptance used the loopback origin;
  remote HTTPS verification was an HTTP/binary-content check, not a remote browser
  session. No Tailscale configuration changed.
- All seventeen compiled design hashes remain unchanged. This pass changes export
  capability and rendering/inspection, not architectural revisions. Studio lighting
  removes cast shadows for clearer inspection; warm lighting retains them. The
  half-texel UV inset visibly removes neighboring-texture specks at block seams in
  both the model and material schedule.

The first isolated probe started before its HTTP fixtures had downloaded and
correctly failed with `No browser schematics tested`. After all seventeen fixtures
were present, the complete rerun passed. The user approved the EULA for this
disposable test server. No live-world data, model calls, new dependency installation,
commit or push was involved.

This readback supersedes the pending schematic checks recorded below for mansion
R0, clinic R2 and Rosedale R1. In-game visual inspection, player movement, physics,
resource-pack/shader matching and interactive paste/undo are still pending.
See [export format, use and reproduction](schematic-export.md).

## Clinic postmodern R2 and Rosedale redesign R1 — build 20260905.04

Verified locally on 2026-09-05:

- **142 pytest tests passed.** Eight added checks cover removal of clinic word
  signage, exact preservation of the coloured logo, clinic circulation, Rosedale
  replacement components/materials, all six residential levels and studio access,
  unchanged superseded hashes, budget limits and nonempty meshes.
- **NEW_DESIGNS_BROWSER_PASS**, **DEPARTMENT_BROWSER_PASS** and
  **MATERIAL_ICONS_BROWSER_PASS**. Both new revisions are the defaults. Exterior,
  clinic front, roof and cutaway views were inspected. Fixed-camera comparisons,
  material thumbnails, nine-project register and mobile layout passed without
  browser errors. The catalogue contains seventeen revisions.
- All fifteen previously compiled artifacts retain their hashes. The preview
  was restarted with the existing loopback/HTTPS configuration; a separate
  tailnet device confirmed both new default revisions. No proxy settings changed.

| Artifact | Cells | SHA-256 |
| --- | --- | --- |
| Braemar R2 | 7,630 | `bcda88879271b10757765f1f2a88520ba02e948a028715c35257e11b776a0197` |
| Rosedale R1 | 7,067 | `07fd22963d1bdbd83d0113df40cb943d7ebe74315b21c15ddc869665ae04a863` |

The clinic removes the lettering, fascia, monogram monument and arrow sign, but
retains interior floor numerals. Its logo geometry is exactly unchanged.
Rosedale is newly authored rather than a palette substitution; the old portal
and crown are absent. These two new revisions have not had a Paper/WorldEdit
round-trip or in-game inspection. Voxel route checks do not certify physics,
functional furniture, roof access or final interior fit-out. No new dependencies,
paid inference, live-world placement, commit or push were performed.

## Braemar Frame House and detailed interiors — build 20260905.03

Verified locally on 2026-09-05:

- **134 pytest tests passed**, including six new mansion checks: bounded
  irregular massing and room programme, thin-arm furniture and fixtures,
  stained-pane preference with intentional clear glazing, room/stair/roof
  reachability, nonempty rendered geometry and unchanged clinic R1.
- **BROWSER_PASS**, **NEW_DESIGNS_BROWSER_PASS**, **DEPARTMENT_BROWSER_PASS**
  and **MATERIAL_ICONS_BROWSER_PASS**. Nine projects/fifteen revisions load;
  mansion exterior, front, bedroom, living-floor and roof-lounge views were
  visually inspected. Camera framing follows site dimensions on project changes
  and stays fixed for revision comparisons. Mobile width, branding/themes,
  material thumbnails and browser interactions passed without page errors.
- All fourteen previous artifact hashes remain unchanged after recompilation.
- The preview process was restarted on loopback with its existing HTTPS origin.
  A separate tailnet device fetched the mansion artifact and confirmed its hash,
  dimensions and cell count. No proxy or public-exposure settings changed.

Final `mansion/r0`: dimensions `{x:44,y:24,z:40}`, 7,474 cells, SHA-256
`8ffe4a99d56f4a5feb70de878146e4a195b50b3a3444a28e5895159d7150c660`.

The temporary Java toolchain and isolated test-server directory from the prior
session were no longer present after restart. Java 21 was restored to a fresh
temporary directory with the downloaded archive checksum verified. This release
was **not** round-tripped through Paper/WorldEdit; the mansion's schematic export
and in-game inspection remain pending. Earlier recorded round-trip results apply
only to those earlier artifacts. Voxel reachability is not player physics.

A direct renderer probe found wall signs produce an empty mesh. Sofa arms use
visible open trapdoors instead; sign models/text require further implementation.
Beds, cupboards and appliances are decorative block combinations, not populated
or functional block entities. No new project dependencies, paid inference,
live-world edits, commit or push were performed.

## BraemarHealth R1 glazing, enlargement and signage — build 20260905.02

Verified locally on 2026-09-05:

- **128 pytest tests passed**, with seven new R1 regressions: immutable R0,
  increased floor area within budget, connected tinted/clear panes, exact logo
  pixels from the public frontage, compiled lettering direction, expanded-room
  circulation and meshing. The seven focused checks were rerun after the final
  monogram/arrow legibility adjustment.
- **NEW_DESIGNS_BROWSER_PASS**, **DEPARTMENT_BROWSER_PASS** and
  **MATERIAL_ICONS_BROWSER_PASS**. The new R1 is the default; R0 comparison keeps
  the camera fixed. Site labels switch between 36 × 36 and 32 × 32 using artifact
  dimensions. Exterior, front and clinical-floor cutaways were visually inspected.
- **APARTMENT_ROUNDTRIP_PASS cells=7736** and **BUILDER_SMOKE_PASS** for the final
  R1 under isolated Paper 1.21.11 / WorldEdit 7.4.0, followed by shutdown. All pane
  states, lettering cells and dimensions survived full schematic readback.
- A separate tailnet device retrieved the final R1 artifact over the existing
  HTTPS route. No proxy settings or live-world blocks changed.

Final `braemar/r1`: dimensions `{x:36,y:32,z:36}`, 7,736 cells, SHA-256
`d7ae97c459bde882d658dbdf3f8d9d360ded713ad87ebddcbc065283b10eb0d7`.
Main ground-floor footprint: 475 → 609 cells (about 28% larger). All thirteen
previous artifacts retain their hashes. Eight projects/fourteen revisions total.
The standing user glazing and signage preferences are saved in
[building-style.md](building-style.md). No new dependencies, live placement,
paid inference, commit or push. Lettering is actual compiled block geometry;
small text-bearing sign block entities are not implemented.

## BraemarHealth clinic — build 20260905.01

Verified locally on 2026-09-05:

- **121 pytest tests passed.** Six new checks cover separate identity/programme,
  reference motifs, three-floor room/stair reachability, rendering and unchanged
  Garden Medical Clinic R0/R1 hashes. The six clinic checks were rerun after the
  final hanger-material correction.
- **NEW_DESIGNS_BROWSER_PASS**, **DEPARTMENT_BROWSER_PASS** and
  **MATERIAL_ICONS_BROWSER_PASS**. The catalogue contains eight proposals and
  thirteen revisions. The new clinic supports direct links, all three clinical
  cutaways, front/roof views and material thumbnails; no page errors occurred.
  Exterior, front and floor-plan screenshots were visually inspected.
- **APARTMENT_ROUNDTRIP_PASS cells=6076** and **BUILDER_SMOKE_PASS** in the isolated
  Paper 1.21.11 / WorldEdit 7.4.0 harness, followed by automatic shutdown. The
  initial export caught `minecraft:chain` being unavailable in the target
  registry; the final design uses slim iron-bar hangers supported by both asset
  sets. The final full schematic readback passed.
- A separate tailnet device fetched the final artifact over the existing HTTPS
  route. No proxy configuration or live-world changes were made.

Final `braemar/r0`: 32 × 32 × 32, 6,076 cells, SHA-256
`f91a1687a0c2492e1010c172a537635e34a9ebba530ca2b8def14c0981fe9715`.
All twelve prior artifacts remain unchanged. The study is reference-led, not a
surveyed reconstruction or confirmed new canon location. Circulation remains a
conservative voxel check, not game physics, accessibility or clinical compliance.
No dependencies, paid inference, live placement, commit or push were added.

## Material block icons — build 20260904.04

Verified locally on 2026-09-04:

- **115 pytest tests passed**, including nine new shape, empty-air and invalid-name checks for material thumbnails.
- **MATERIAL_ICONS_BROWSER_PASS** and **DEPARTMENT_BROWSER_PASS**, with no page errors. All seven projects loaded their material icons; shared types fetched only once per page session. Browser checks cover decoded images, air marker, failed-icon fallback without losing names/counts, theme switching and mobile width.
- Light/dark desktop and mobile material schedules visually inspected. Icon geometry uses the existing pinned Minecraft models, including slabs and two-block doors, with a reusable offscreen renderer.
- A separate tailnet device successfully fetched the new icon endpoint over the existing HTTPS route. The local app was restarted; proxy settings were unchanged.

No building artifacts, dependencies or world state changed. Schematic checks were not rerun for this UI-only release. Work remains local and uncommitted; no hosted CI result is claimed.

## Irregular revisions, postmodern apartments and UI build 20260904.03

Verified locally on 2026-09-04:

- **106 pytest tests passed.** New coverage preserves clinic/market/school R0
  hashes, checks non-rectangular roof coverage and open-sky court points, verifies
  room connectivity in each R1, and reaches all six apartment levels and both
  studios on the first five levels using the existing conservative voxel model.
- **All three served-browser suites passed**, with no page errors. Checks include
  latest-R1 selection, stable-camera R0 comparison, change overlays, new apartment
  full-height selection at 32 blocks, roof views, cutaways and seven-project
  register. UI acceptance checks the Buildings Department subline, removed
  cutaway disclaimer, visible build number, fonts, theme, local notes and mobile
  width. Final exteriors, roofs and cutaways were visually inspected.
- **Four full schematic round-trips passed**, each logging
  `APARTMENT_ROUNDTRIP_PASS` and `BUILDER_SMOKE_PASS` under the isolated
  Paper/WorldEdit harness. Test servers shut down after verification.
- **Tailnet verified:** the remote Mac returned seven projects and twelve
  revisions, with the three service buildings defaulting to R1. Native Windows
  Chrome rendered the complete six-storey apartment and updated UI over the
  existing HTTPS route. No proxy exposure changes were made.

| Artifact | Cells | SHA-256 |
| --- | --- | --- |
| Clinic R1 | 3,686 | `a1d16665985a9a7370d320370a18fc79eb14bdfc4d0bc4d7fe6c0e37545a7def` |
| Market R1 | 3,097 | `e5130e23df86feac934afaee7d6fd09e07f0e68068ba25e8dceb4637c40954a6` |
| School R1 | 4,638 | `a3ef68e45a6fd7d1b556c0ba58771a35aa4d15cc028a20de86b7f0a6070d2d16` |
| Rosedale Court R0 | 5,835 | `b1ef4e21e2e5a264c582a07b0d46bf461350671b52f9bcf46b314d36b53ea260` |

All eight prior artifacts remain unchanged. The release build label is distinct
from design revisions and artifact hashes. No dependencies, live-world writes,
paid inference or zoning implementation were added. Room connectivity is not
Minecraft collision/physics simulation or code compliance. Work remains local;
no commit, push or hosted CI result is claimed for this pass.

## Neighbourhood services proposals (2026-09-04)

- **93 pytest tests passed.** The catalogue now has six projects and eight
  revisions. New tests compile and mesh all three service buildings, require
  their distinct programme components and verify conservative voxel routes to
  care rooms, retail aisles, stockroom, classrooms on both levels, administration
  and canteen. All five earlier artifact hashes remain unchanged.
- **Three served-browser suites passed:** `BROWSER_PASS`,
  `DEPARTMENT_BROWSER_PASS`, and `NEW_DESIGNS_BROWSER_PASS`, with no page errors.
  The new suite checks project deep links, cutaways, the six-project register and
  mobile width. Exteriors, clinic/market floor plans, both school floors and the
  register were visually inspected. Existing theme, notes, comparison and
  interaction checks still pass.
- **All three schematic round-trips passed.** Separate isolated Paper 1.21.11 /
  WorldEdit 7.4.0 runs logged `APARTMENT_ROUNDTRIP_PASS` and `BUILDER_SMOKE_PASS`
  for the final artifacts below, checking every requested cell and dimensions.
  Each test server stopped afterward; no blocks were placed in a live world.
- **Private preview verified.** A separate tailnet Mac fetched the six-project
  catalogue and confirmed the final market artifact's hash and 3,602 cells.
  Native Windows Chrome rendered the school through the existing HTTPS route.
  The application remains loopback-only; no Serve or Funnel configuration was
  changed. Full automated interaction tests used WSL loopback.

| Project | Cells | Artifact SHA-256 |
| --- | --- | --- |
| Garden Medical Clinic R0 | 3,877 | `cb1e3add90641622941c64d927bcd0b8a3cdf82a9a3468b48598e26c7148670d` |
| Go Corner Market R0 | 3,602 | `951781d286adbb26976baabec4fb09c4fbc777cbeb8470f6bcf9beee7e53261a` |
| Parkside Elementary R0 | 4,911 | `9c39a0d6f7640be17bdfd97bfc4c1e7e9ea3cb3baba785ebe9e854204155e37f` |

These are authored first proposals with architectural furniture and open
doorways. Route checks are not player collision simulation, and schematic
readback does not establish real-world building-code compliance or Minecraft
physics behavior. No new dependencies, paid model calls, automatic placement or
zoning tools were added. See [programme and reference notes](design-proposals.md).
Results are local; no push or hosted CI result is claimed for this addition.

## builder multi-project workspace (2026-09-04)

- **84 pytest tests passed.** Catalogue IDs/revisions, new design compilation/meshing, conservative route connectivity, existing apartment hashes and all previous regressions pass.
- **`BROWSER_PASS` and `DEPARTMENT_BROWSER_PASS`.** Served Chromium verifies model interactions, baseline comparison, cutaways, selection, PNG, failed-load recovery, project search/switching, direct links, notes isolated by project/artifact, JSON review export, help, 390px layout, persisted theme, locally loaded DM Sans/Urbanist, and Live/Offline state changes. Screenshots were visually inspected in light and neutral-charcoal dark themes.
- **Tailnet.** Native Windows Chrome rendered the final workspace through the existing HTTPS route. A separate Mac fetched all three project entries (five revisions). No proxy/Funnel changes were needed beyond the existing private route. Automated interactive browser testing remains local to WSL because it cannot directly reach the host's Tailscale listener.
- **Both additional schematics passed full readback.** Terrace Mews: 3,318 cells; Civic Reading Room: 2,859 cells. Each isolated Paper/WorldEdit run logged `APARTMENT_ROUNDTRIP_PASS` (the existing generic harness marker) and `BUILDER_SMOKE_PASS`, then stopped. No world placement or model inference.

| Project | Revision | Artifact SHA-256 |
| --- | --- | --- |
| Terrace Mews | R0 | `a613a807615ffbbc4bbb01a96b0d48a505b22a91dfed01341cd0b82b471c1e2f` |
| Civic Reading Room | R0 | `a45f0456734cc974f2745936f0bcb06112ec33c090eda8df29bd2ed93e48f9a6` |

The apartment hashes below remain unchanged. New route tests check the duplex living/upper-bedroom/balcony spaces and library reading/stack aisles using the same conservative voxel assumptions as before, not Minecraft collision physics. Local notes are not a shared backend or permit decisions. Live/Offline describes the workspace server only. Fonts are locally served with bundled OFL notices; no browser font-CDN dependency was introduced.

The proposed authoring service and later shared-review/execution stages are documented in [interactive-workspace.md](interactive-workspace.md). They are plans, not current editing APIs. This work remains local/unpushed; hosted CI is not claimed.

## Modern R2 and private tailnet review (2026-09-04)

- **78 pytest checks passed:** prior coverage plus nine proxy-origin checks and three additional R2/layout checks. R0/R1 hashes remain unchanged. All three revisions retain voxel-route connectivity to the six units and roof.
- **R2 browser acceptance passed:** default R2 load, R0/R1 comparison, stable camera, actual pointer/keyboard interaction, cutaways, component picking, diff, PNG, narrow layout, and failed-load recovery; zero page errors. Exterior and cutaway screenshots were visually inspected.
- **Tailnet HTTPS verified:** a dedicated host-side Tailscale Serve listener on 8463 proxies to loopback 8091. Existing listener 8462 remained unchanged. Serve configuration contains no Funnel exposure. Windows HTTPS returned 200 and native Windows headless Chrome rendered R2 from the tailnet URL. A separate tailnet Mac fetched R2 and confirmed its hash and cell count. Unknown Host requests still receive 403.
- **R2 schematic round-trip passed:** isolated Paper/WorldEdit logged `APARTMENT_ROUNDTRIP_PASS cells=5006` and `BUILDER_SMOKE_PASS`; every R2 cell was checked on readback. No live-world writes or paid inference.

R2 has 5,006 cells and changes 808 positions relative to R1: 134 additions, 542 state replacements, and 132 removals. Interior partitions, stairs, furniture, site, floor plates, and landscape cells are identical to R1. Exterior brick is replaced with a pale/charcoal/glass/oak composition; the heavy pergola becomes a shallow slab canopy.

```text
23d5ff81fde2cfe7b757dd52863f646c0928525710f4fd5ccb4297e69f7e045d
```

Linux Chromium cannot directly reach the Windows Tailscale listener in this WSL environment, so full interactive acceptance ran against local loopback; HTTPS visual verification ran in native Windows Chrome. This distinction is not a certificate bypass. Tailnet access is subject to its existing access policy. The Serve route persists in the background, but the preview Node process has no new autostart service. Actual private origins remain runtime-only. No hosted CI or push is claimed for this local revision.

## First apartment review (2026-09-04)

| Check | Result | Scope |
| --- | --- | --- |
| Gradle `build smokeTestJar` | Passed | Java 21 plugin and isolated harness packaging |
| `python -m pytest tests -q` | 66 passed | 35 legacy checks, 19 compiler checks, 8 renderer checks, 4 apartment checks |
| Served-page Chromium | `BROWSER_PASS`, no page errors | Mouse orbit/pan/zoom, keyboard camera, block picking, component outline, cutaways, revision switching with stable camera, diff overlay, PNG download, 640px layout, failed-load recovery |
| Windows loopback HTTP | 200 OK | Host Windows can reach the WSL viewer at `127.0.0.1:8091`; not a native Windows visual test |
| Complete apartment export/readback | `APARTMENT_ROUNDTRIP_PASS cells=5004` | Every R1 cell compared to registry-normalized state after Sponge schematic readback, plus dimensions |
| Existing isolated smoke checks | `BUILDER_SMOKE_PASS` | Registry/state validation, existing-file preservation, legacy schematic fixture |
| `npm audit --omit=dev` | 0 vulnerabilities reported | Locked installed preview dependencies at verification time; not an exhaustive security review |

R0 contains 4,932 cells; R1 contains 5,004. The comparison has 88 additions, 12 replacements, and 16 removals, confined to floors, balconies, entrance, and landscape components. The immutable R1 artifact hash is:

```text
a4e1697a982247100dced54e5b00a9954bdb447d6c31a91f7910782b107ff2b4
```

The preview and schematic harness consumed that same artifact. The harness ran with `BUILDER_PREVIEW_FILE` pointing to `preview/generated/r1.json`, in the separate loopback Paper 1.21.11 build 132 / WorldEdit 7.4.0 server, and shut itself down after the checks. It created a schematic and paired artifact JSON without placing blocks in a world. No paid inference or live-world writes occurred.

Visual inspection covered the exterior, floor cutaway, and narrow layout. Linux Chromium ran with SwiftShader/software rendering. One R1 full mesh build took 153 ms and produced 20,446 rendered triangles. A complete interaction run reported 118 animation frames over 6.19 seconds; that is an instrumented software-rendered test, not a native GPU frame-rate benchmark. No maximum-budget performance claim is made.

Circulation tests prove connectivity under a conservative voxel model with two-cell headroom, one-block height changes, and openable doors. They reach living spaces, bedrooms, bathrooms, and the roof in both revisions. They do not simulate Minecraft collision shapes, door interactions, support updates, physics, or player movement. The preview uses tested Minecraft 1.21.4 renderer assets against a 1.21.11 export target; final in-game texture/shader and neighbor-state appearance remain unverified.

The updated CI configuration installs renderer dependencies and compiles both revisions before regressions. These first-review results are local; this revision has not been pushed or verified by hosted CI. Browser acceptance uses an existing local Playwright/Chromium installation and is not part of hosted CI.

## Foundation refresh results (2026-09-04)

| Check | Result | Scope |
| --- | --- | --- |
| Gradle build | Passed | Java 21 compilation and plugin packaging against Paper 1.21.11 / WorldEdit 7.4.0 |
| `python -m pytest tests -q` | 35 passed | Grid validation and Gemini response/loopback HTTP checks |
| Isolated Paper smoke test | `BUILDER_SMOKE_PASS` | Plugin loading, stair-state schematic round-trip, dimensions, invalid states, and existing-file preservation |
| `git diff --check` | Passed | Whitespace validation |
| Player placement/undo, permissions, load | Not yet tested | Requires the interactive checks below |

The smoke test used Paper 1.21.11 build 132 and WorldEdit 7.4.0 in a separate loopback-only server with generated test worlds. It ran without model credentials and shut itself down after the checks. No paid inference or live-world changes were used for verification. The build and 35 regressions were rerun after the final command-parser cleanup; that cleanup did not change the schematic path exercised by the smoke test.

The GitHub Actions workflow is configured to run the build and regressions. The results above are local results, not a claim that hosted CI has already passed.

## Automated regressions

### Studio build 20260906.05 (2026-09-06)

- The first user-selected real Praya plot was captured: 27 by 15 buildable blocks
  plus an eight-block context band, 85,312 surveyed cells and 43,356 non-air cells.
  Both complete read passes matched. Twenty-four block-entity cells were protected;
  all were outside the buildable footprint. Grass blocks in the plot span Y 78–80.
- Praya runs the updated plugin in read-only mode. Actual endpoint checks rejected
  write routes, wrong world UUID and out-of-bounds reads. The studio's isolated
  construction connection was retained. No building was placed in Praya.
- Gradle build and 176 regression tests passed (41.26 seconds). Additional surface
  presentation coverage passed all 12 capture contracts after the view change.
- `PRAYA_SURVEY_PASS`: exact plot/context bounds, read-only live connection,
  preserved construction adapter, reloadable site link, surface/full-depth toggle,
  unchanged survey hash, undersized-template rejection, OLED and mobile rendering.
- `WORKSPACE_SHELL_PASS`: existing catalogue controls remained functional after
  adding ground-height-aware camera framing; default catalogue framing is unchanged.

Private service settings and the managed SSH forward are deployment configuration,
not repository secrets. The first plot still needs bespoke proposals, review,
bounded placement and a player walkthrough.

### Studio build 20260906.04 (2026-09-06)

- Gradle build passed with the updated Paper survey endpoint.
- Full regression suite: 176 passed in 44.70 seconds. The final additional world
  UUID mismatch guard passed the four construction contract tests separately.
- Actual isolated Paper capture: 36,864 cells, two complete matching passes in
  30.29 seconds, producing 1,920 non-air cells. Browser cancellation published no
  partial site; reload retained capture history and opened the verified survey.
  A final capture-to-design run compiled all three apartment studies as valid
  candidates bound to that freshly captured site.
- `STUDIO_PASS`: three apartment studies, scoped geometry preservation, roof
  variant, undo/redo, immutable save/reload, exported placement package and themes.
- `STUDIO_MAP_PASS`: visual frontage/protected marking, durable selection,
  WorldEdit fallback import, malformed input rejection and mobile layout.
- `BLUEMAP_HANDOFF_PASS`: real map mouse clicks selected a 47-by-47 area, showed
  the outline and handed exact bounds to production studio. No game writes.
- `STUDIO_RELEASE_PASS` and `WORKSPACE_SHELL_PASS`: production retained its three
  clean drafts and survey; branding, OLED, mobile and catalogue controls passed.

Automatic capture is connected to the disposable `builder-isolated` world.
Praya's older plugin remains installed. A user-selected real plot, configured
Praya adapter and actual player walkthrough remain outstanding acceptance gates.

Run `python -m pytest tests -q` with a Java 21 JDK and Node.js 20+ available. Install preview dependencies with `npm --prefix preview ci --ignore-scripts` to run renderer checks instead of skipping them. The suite uses the existing pytest runner and JDK probes, without introducing a Java test framework. Gradle resolves the same Paper/WorldEdit dependencies used for compilation.

Coverage includes valid legacy JSON, strict dimensions and coordinates, duplicate/empty builds, block budgets, block-state text preservation, Gemini response parts/finish reasons, and local HTTP success/error paths. No model credentials or inference requests are needed.

## Workspace design pass b20260906.07 (2026-09-06)

- Production HTTPS `/` and `/studio` serve b20260906.07 with icon theme controls.
- `HEADER_CONTROLS_PASS`, `WORKSPACE_SHELL_PASS`, `DEPARTMENT_BROWSER_PASS`:
  clean SVG navigation, keyboard theme cycling, saved OLED preference, register
  filtering, local notes and mobile layout.
- `DESIGN_NAVIGATION_PASS`: the Corner court heading, keyboard and pointer layer
  switches, cutaways, camera selection, workflow section links, register deep
  link/reload, grid visibility and widths 320, 390, 768 and 1440.
- `EXPORT_TOOLS_BROWSER_PASS`: camera fitting, component focus, expanded view,
  schematic/source downloads and export identity remain intact.
- `STUDIO_RELEASE_PASS`: production's three existing candidates remain valid.
- `STUDIO_PASS` in a separate temporary repository: three proposals, scoped
  material edit with unrelated geometry preserved, roof variants, undo/redo,
  immutable save/reload, placement package, themes and mobile layout.
- The authoring check exposed an initial-connection race; controls now remain
  inert until startup settles, preventing silently ignored early clicks.
- Inspected rendered phone and desktop screenshots of studio and design review.
  These are Chromium viewport checks, not a physical iPhone/Safari verification.

## Isolated Paper smoke test

`./gradlew build smokeTestJar` also creates `build/libs/praya-builder-0.2.0-SNAPSHOT-smoke-test.jar`.

Use a disposable Paper 1.21.11 server directory with its own empty world, a loopback bind address and an unused port. Install WorldEdit 7.4.0, the normal plugin JAR, and the smoke-test JAR there. Do not copy production credentials or world data. Follow the normal Minecraft server EULA process.

Start that isolated server with `BUILDER_SMOKE_TEST=1` in its environment. The smoke plugin validates stair-state schematic round-trips, declared dimensions, rejection of unknown blocks/invalid properties, and preservation of existing files. It writes temporary schematics under the isolated plugins directory, logs `BUILDER_SMOKE_PASS` or `BUILDER_SMOKE_FAIL`, then shuts down that server. A zero server exit code alone is not a pass; check the marker.

Without that environment flag, the smoke plugin disables itself. Never install the smoke-test JAR on a real server.

Optionally set `BUILDER_PREVIEW_FILE` to the absolute path of a compiled preview artifact. The harness then validates and exports its block map, reads the schematic back, checks every requested state and dimension, and writes the paired JSON beside the schematic. `APARTMENT_ROUNDTRIP_PASS` confirms this additional gate. Compile the artifact first using the [preview workflow](../preview/README.md).

## Remaining interactive checks before deployment

- Generate a small build and confirm the captured placement origin and world-height checks.
- Place and undo a build with an actual player; verify adjacent user changes remain intact.
- Exercise a WorldEdit change limit so a partial edit remains undoable.
- Confirm pending-request and cooldown behavior, including disconnects and world changes.
- Measure tick responsiveness at the configured block ceiling.

The registry/schematic smoke test does not cover player interaction, actual world placement/undo, permission combinations, or load performance. Browser design-review checks are recorded separately above and do not replace those game checks.
