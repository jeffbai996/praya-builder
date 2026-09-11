# Transport Builder — implementation handoff

Date: 2026-09-11. Audience: the next agent/designer implementing a transport-department version of Praya Builder.

## Brief and authority

The user wants a transport-department version of Builder for transport infrastructure, including subways and freeways. They also endorsed the direction of an address/parcel/building register and confirmed that Praya already has street addresses for the most part. Deliver a transport workspace that works with those shared place records and existing infrastructure.

“Transport Builder” and “Transport Department” are working product labels here, not newly confirmed institutional names. This handoff defines a proposed implementation, not an implemented product or permission to place infrastructure into the live world. Current real-plot placement remains paused. Begin with design, surveys and review; any later live construction needs an explicitly authorized bounded operation.

Authority order:
1. Direct user instructions and corrections.
2. `docs/praya/README.md`, `docs/praya/canon.md`, and `docs/building-style.md` for Praya facts and style.
3. `docs/praya/sign-formats.md` for observed sign formats and unresolved evidence.
4. `docs/praya/proposals/land-and-building-register.md` for the endorsed register direction; detailed implementation remains proposed.
5. This handoff for proposed transport implementation choices.

Do not promote generated examples, addresses, route numbers, engineering dimensions or institution names into canon. Use Praya, never Prayan. The Praya Manual of Traffic Devices is the confirmed manual name; obtain the actual relevant assets/specifications before claiming compliance. Current canon records National Highways (NH), municipality-specific street-sign variation and orange/dark gray identity. Keep qualifications in the source documents.

## Product outcome

People should be able to find a street, line, station or corridor; see what exists; propose an upgrade; inspect the route in plan, profile, section and 3D; compare alternatives; and save a reproducible design with clear connections to its surroundings.

Separate transport network identity from individual work packages. A freeway may have junction, bridge, resurfacing and signage projects. A subway line may have several station and tunnel projects. Editing one package must not imply replacing the whole route.

Preserve this distinction everywhere: observed existing infrastructure, a proposed design, and verified construction are different states. Saving a design does not update the recorded as-built network.

## Recommended relationship to Builder

Reuse the Builder engine and shared registry. Add transport-specific design and inspection tools behind a distinct transport workspace; avoid maintaining a divergent copy of the entire application or another address database. Repository/package boundaries can be decided during implementation, but common contracts need one owner.

Builder/register: find places, buildings, infrastructure and projects.
Transport Studio: edit alignments, sections, structures and signs.
Survey/construction services: capture evidence and execute explicitly reviewed bounded changes.

The land-register implementation does not yet exist. Define a small stable interface to its future IDs, allowing unassigned studies and provisional local records until it does. Do not block a synthetic transport prototype on implementing a whole municipal GIS.

## Verified reusable foundations and limits

Inspected in the WSL repository `/home/jbai/repos/praya-builder`, branch `refactor/builder-foundation`. Recheck git state and runtime before implementation; this handoff does not assert current service health.

| Existing source | Reuse and limit |
|---|---|
| `preview/capture-selection.cjs`, `capture-service.cjs`, `sites.cjs` | Selection and dated surveys, world coordinates, protected areas, site assessment. Current imported survey max axis 128 blocks and volume 262,144; imports exclude entity/block-entity contents and flag that limitation. |
| `docs/praya-map-connection.md` | BlueMap handoff and read-only survey workflow. Map camera Y is not ground elevation. Map tiles are visual context, not proof of the current underground state. |
| `src/main/java/org/govpraya/builder/plan/PlanCompiler.java` | Structured plan compilation. Current max dimensions X/Z 48 and Y 64; 10,000 final cells, 128 signs, 4,096 expanded primitives and 100,000 expansion-work budget. |
| `preview/design-service.cjs`, `workspace-store.cjs` | Drafts, immutable saved artifacts, comparisons, bounded compilation and concurrency checks. Compiler input also has a 1 MiB limit. |
| `preview/scene.js`, `studio.js`, `studio.html` | Model review, cutaways, orbit/pan/free camera, component inspection and theme support. Building-focused framing and camera controls need transport-specific extension. |
| `preview/schematic.cjs`, `thin-block-connections.cjs` | Sponge export and explicit thin-block connections. Geometry and sign text must agree between saved artifacts, preview and export. |
| `preview/construction-service.cjs`, `docs/sign-bridge.md` | Reviewed changes, readback, interruption recovery, conflict-aware undo and bounded wall-sign metadata support. Documented sign bridge tests used disposable Paper; they are not proof of live Praya deployment. |
| `preview/accessibility.cjs` | Conservative voxel walking checks; not road-network validation, a rail simulator or proof of in-game movement. |

Do not raise every limit to accommodate a kilometre-long alignment. Build corridor tiling, deterministic ownership at seams, bounded jobs and lazy inspection first. Count explicit air/excavation and survey volume as work, not just visible finished blocks.

## Proposed shared data model

All geometry includes a Minecraft world identity. Use X/Z in block units, with Y elevation explicitly retained. Store the origin and coordinate convention, including exclusive upper bounds where appropriate. Do not silently treat block coordinates as latitude/longitude.

- **Street/route/line:** persistent identity, confirmed names/aliases, transport mode and links to the registry. Road, transit service and physical track identities may differ.
- **Infrastructure graph:** physical nodes and edges with endpoint position, elevation and permitted connections. Crossings at different Y values are not junctions. Road direction/turn connections and rail connections require explicit meaning.
- **Corridor/alignment:** horizontal route plus vertical profile, direction and section assignments. Track continuous design geometry separately from its deterministic voxel realization.
- **Chainage:** distance along a specified alignment revision. Explain in the UI as distance along the route. A chainage alone is not a durable asset identifier after an alignment changes.
- **Cross-section template:** road/track arrangement, pedestrian/service space, separation, drainage and clearance envelopes. Values are proposed configurable parameters until verified against Praya precedent and the intended game mechanics.
- **Structure/asset:** station, entrance, platform, interchange, bridge, tunnel, portal, retaining wall, sign assembly or service room. Each has stable identity, footprint/volume and connection points.
- **Transport project:** bounded scope, affected assets/corridors, alternatives, design versions, references, review state and optional survey bindings.
- **Survey segment:** timestamp, verified extent, source/hash and completeness. Unknown volume is not empty air.
- **Construction package:** exact immutable segment artifacts, transforms, explicit write masks, sequencing dependencies and verification state.

Address records belong to the shared register. Attach station entrances and relevant facilities to existing addresses; roads and tunnels need route/segment identity even where they have no street address. A corridor can cross many parcels and municipalities. A design footprint does not establish ownership, an easement or an official right-of-way.

## Route-to-block generation

Use the LLM to propose design intent, choose/refine templates and interpret reviewed references. Use deterministic code to generate repeated geometry, voxelize alignments, resolve block states and check continuity. Do not ask a model to enumerate an entire motorway block by block.

Generation should:
- Sample a versioned horizontal alignment and vertical profile deterministically; define corner/curve and staircase rules rather than leaving gaps between rotated modules.
- Resolve rails, stairs, slabs, panes, barriers and sign orientation from final neighboring geometry. Current quarter-turn block rotation is useful but is not an arbitrary-angle corridor generator.
- Define explicit ports at segment ends: position, tangent/direction, level, width/gauge and clearances. Generate overlapping context at seams but assign each writable cell to exactly one segment.
- Give components stable identities for scoped revisions. Regenerate dependent junction/transition segments when adjacent alignment changes.
- Produce separate excavation, structure, surface/track and furnishing/signage stages, all included in the reviewable change set. Do not silently clear a full bounding box.
- Reject contradictory writes and report missing survey coverage before a package can become construction-ready.

Long projects need per-segment hashes and incremental compilation. A local sign change should not recompile every tunnel. Route-level manifests must pin exact child versions so a saved assembly cannot drift.

## UI and organization

Build around tasks: **Locate → Design → Review**. Keep construction distinct when available. Offer a map/list view of routes, assets and work packages with search, municipality/mode/status filters, recent work and server-side pagination. Do not put hundreds of segment versions in a select menu.

The workspace should include:
- A route overview showing the selected work extent, neighboring segments and connection issues.
- Synchronized plan, elevation-profile and cross-section views. Moving along a route updates the section and 3D position.
- A route-following camera and jump-to-station/portal/junction controls, plus existing free camera.
- Clear 3D controls for terrain cutaway, underground infrastructure, excavation, protection and changed blocks. Cutaway only affects the view; excavation affects the authored result.
- Compact summary cards for dimensions, connections and review findings. Put advanced geometry and raw state controls behind Details.
- Orange previews, green saves/additions, blue exports, amber unresolved conditions and red errors, always paired with text/icons.
- Mobile browsing, issue review and coarse selection that remain usable; do not assume a phone can support desktop-density alignment editing.

Use familiar labels such as Route, Segment, Station and Address. Keep technical IDs out of ordinary labels. Each project should expose its current design; history belongs in a version panel.

## First milestone: bounded road corridor proof

Deliver one synthetic local-street corridor with two connected segments and a slight bend or elevation transition. Keep each artifact within current compiler limits. Treat template widths, gradients and markings as provisional. Preserve current building workflows.

Acceptance criteria:
1. Create a route project, set endpoints and select a section template.
2. Generate two bounded segments with unique cell ownership and matching seams; changing an endpoint deterministically updates affected geometry.
3. Inspect route plan, a basic vertical profile, sections and the exact 3D blocks, including the shared seam.
4. Include a deliberate Praya streetscape with verified sign composition, layered kerbs/edges, appropriate lighting and clear pedestrian connections. Do not invent a real street name or civic number.
5. Save/reopen the route assembly without changing child hashes; export exact segment schematics and an assembly manifest with origins.
6. Validate in an isolated test world if authorized for that milestone: drive/walk the joins using the intended mechanics and inspect signs. Browser screenshots alone do not establish traversal.
7. Show why an intentional gap, wrong elevation, conflicting segment write or unknown survey segment fails review.
8. Report compile time, peak memory, cell/air count, survey volume, mesh size and idle/render responsiveness using measured figures. Keep performance claims bounded to the tested workload.

Then add a small two-track tunnel/portal study, followed by a compact station and its entrances. Confirm the server's actual train/minecart/plugin mechanics before choosing gauge, slopes, curve behavior, platform clearance or signals. Later phases cover freeway sections, ramps/interchanges, bridge spans and multi-level junctions. Do not start by attempting a complete subway line or cloverleaf.

## Verification and construction concerns

- Unit/geometry fixtures: straight/bent/sloped sections, segment seams, reversals, curves, height-separated crossings, tunnel/portal transitions and rail state continuity.
- Golden/round-trip fixtures: identical input generates identical blocks; exported block states and text match the preview artifact; changes stay within declared component and segment scopes.
- Network checks: endpoints join only when position, elevation, direction and mode match. A continuous-looking model may still contain disconnected rails or an impossible turn.
- Survey checks: coverage, age and conflicts against exact affected volumes. Protect existing stations, tunnels, foundations and block entities. Read-only sign data is evidence, not automatic authority to rename roads.
- UI checks: large mock route/project inventory with real pagination; keyboard and touch operation; saved state; bounds/coordinate alignment between map and 3D; suspended rendering when hidden.
- Execution checks in isolated fixtures: pause/resume at segment boundaries, crashes between stages, partial excavation, stale surveys and conflict-aware undo preserving later edits. Report partial completion rather than promising route-wide atomicity.
- In-game inspection: water/fluid updates, rail behavior, lighting, collision, headroom and any relevant plugin interactions. Do not assume static voxel connectivity proves playable transit.

## Discovery needed before real infrastructure work

Find or verify these from available context and read-only sources first. Ask the user only for unresolved essentials:
- Which real street/line and bounded segment should be the first reference?
- Where is the existing address/street authority: sign catalogue, map layers, government site, another dataset or a combination?
- What transit/vehicle/rail plugins and operating conventions are actually used?
- Which examples define Praya lane markings, signals, freeway signs, station wayfinding and platform/track dimensions? Retrieve actual manual/vector assets where available.
- What verified parcel/municipality boundaries already exist? Do not guess them from neighborhood names.

The first synthetic proof can proceed while this information is collected. It must label its parameters and names as proposals.

## Start here for the next agent

Read AGENTS.md and the authority documents. Inspect git state, running service and current contracts without disrupting active sessions. Inventory reusable modules, then write a short implementation plan for the two-segment road proof. Keep registry integration through stable optional references, keep existing Builder functioning, and produce an inspectable saved project with source plans and test evidence. No live world placement is authorized by this document.
