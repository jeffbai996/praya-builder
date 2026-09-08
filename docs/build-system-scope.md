# Building system scope

Current implementation: build 20260906.01 delivers the first site-aware studio
and bounded isolated construction loop. See [current behavior](site-design-workflow.md)
and [verification](verification.md). The work-package descriptions below preserve
the earlier design and its broader, still-unimplemented ambitions.

Status: first component/browser revision implemented, 2026-09-04. The foundation at `4bfef5a` and the package A delivery described below are implemented. Packages B–D remain proposed. This document turns the [roadmap](agent-roadmap.md) into gated work packages, not a deployment authorization.

Package A delivery: strict bounded Java plan compilation; normalized owned cells and content hashes; authored compact apartment R0/R1; browser inspection, cutaways and cell-state comparison; and complete R1 schematic round-trip through isolated Paper/WorldEdit. The implementation uses `PlanInput`, `PlanCompiler`, and `PlanCli`, plus a Java probe and the `preview/` application. A reusable Java diff API, shared typed grid construction, managed execution, and in-game visual acceptance remain deferred.

## Outcome and first trial

The full system takes a brief, references and an authorized plot; produces a reviewable building; constructs it in bounded jobs; inspects the result; and revises named components without discarding unrelated work.

The user selected a compact apartment as the first showcase type. The first proposal uses a synthetic 32 × 32-block site, three residential floors, six compact units, a roof terrace, furnished room layouts, facade depth, and landscaped frontage. Actual site selection remains open. Circulation is checked with a conservative voxel-route test, not yet with a player. A compact fixture exercises the core problems before a mansion, tower or neighborhood multiplies them.

The user also requires browser/desktop visual review before repeated schematic exports. The [browser design review scope](browser-preview.md) makes a read-only preview of the compiled artifact part of the first delivery. Revise in the viewer, then export the approved revision; do not make the user paste a schematic for each design iteration.

Success means all of the following:

- A saved, versioned plan reproduces the same normalized block-state map.
- The artifact loads correctly in an isolated test world.
- Doors, stairs, rooms and the connection to the approach path are usable.
- An entrance or window revision changes only its declared components and permitted dependencies.
- Interrupted placement is inspectable; a rollback preserves subsequent unrelated edits or explicitly reports conflicts.
- Fresh exterior and interior views accompany exact block checks.
- The user judges architectural fit. A valid schematic is not evidence of good design.

The existing 10,000-entry ceiling remains a small-build limit, not a city-scale performance claim. First validate the system within it; larger buildings require separate capacity measurements and scheduling work.

## Existing foundation and gaps

| Existing surface | Reuse | Missing capability |
| --- | --- | --- |
| `ai/BlockGenerator.java` | Legacy grid generation remains compatible | A plan-producing client and iterative tool loop |
| `generation/BlockGrid.java` | Strict coordinates, bounds and block-state syntax | Component identity, composition, revision semantics and volume/work budgets |
| `generation/SchematicPlacer.java` | Registry validation and Sponge v3 export | Bounded execution, durable jobs, world conflict detection and recovery |
| `BuilderCommand.java` | Existing player command and cooldown | Preview approval, non-player operation and job lifecycle |
| Java probes plus pytest | Pure contract/regression tests | Component fixtures, job failure cases and visual acceptance |

Do not overload `BlockGenerator` to return two incompatible JSON formats. The legacy path and separate versioned plan contract now coexist. The pure compiler emits a review artifact; the isolated export harness reads its block list through the existing `BlockGrid` parser. A validated shared typed construction path remains future integration work, not an implemented API.

## Reference context is input, not a fixed style preset

Keep three kinds of information distinct:

1. User-confirmed identity, location, intended use and canon facts.
2. Visible evidence: massing, facade depth, planting, entrances, paving and neighboring buildings.
3. Interpretation or preference: why the composition works, suspected materials, and possible design rules.

Reference records should carry an ID, source locator, viewpoint, available date, provenance and user corrections. A new screenshot adds evidence; it does not silently replace a district's style definition. Lighting and shaders are separate from the block palette. A single exterior cannot establish dimensions, a floor plan or ownership.

The working brief covers site scale, building massing, facade detail and interiors. In particular, the frontage, approach path, setbacks and planted edges belong to the plan. Neighborhood references constrain those relationships; they do not authorize rebuilding surrounding streets or parks.

Use a level synthetic plot for the first compiler fixture, then a stepped-site fixture before claiming terrain adaptation. Surveyed ground levels and entrance connection points must be explicit inputs. Grading, foundations and retaining elements require their own bounded components; never flatten the entire bounding box as an implicit preparation step. Keep the building type and district context separate from its material palette.

The [site survey and map-aware design package](site-context.md), added 2026-09-05,
makes that input an explicit delivery track: bounded offline map extracts first,
then contextual previews and slope-aware design, then a read-only live adapter.
It can precede packages B/C's write capabilities. Building artifacts bind the
survey hash and coordinate transform; contextual blocks are never implicitly
included in the building's ownership, schematic export or write budget.

Keep private reference images, world coordinates, personal canon and session notes outside public fixtures and documentation. Public examples use generic building names and synthetic plans. The current private reference catalog remains in the existing TTL scratchpad; expiry does not authorize importing it into the repository.

## Work package A: deterministic plan to artifact

Delivered before autonomous world editing or model-provider work. The compiler adds no dependency. Its browser-review companion uses the approved, pinned Prismarine Viewer dependency and transitive Three.js renderer. No second renderer was implemented.

### Version 1 contract

| Field | Meaning |
| --- | --- |
| `schema_version` | Required integer `1`; reject unsupported versions |
| `plan_id`, `revision` | Stable plan ID and immutable revision identifier |
| `dimensions` | Positive integer local bounding box; Y is vertical |
| `palette` | Material-role keys mapped to explicit Minecraft block-state strings |
| `components` | Unique, stable IDs with semantic roles, integer origins and ordered geometry operations |
| `spaces` | Named clearance/room/approach volumes with purpose; these are constraints, not automatic carving |
| `references` | Optional opaque reference IDs; no dependency on external retrieval during compilation |

Components express architectural intent, such as floor, entrance, facade bay, stair, roof, planter or path. Geometry initially needs only a few operations: place a block, fill an axis-aligned box, and repeat a non-repeating sequence along an integer offset. A fill with explicit air makes an opening. Named facade and floor patterns expand through these operations; this is not an arbitrary scripting language.

- All boxes use half-open bounds: minimum inclusive, maximum exclusive. Component origins translate into plan-local coordinates. World coordinates enter only at placement time.
- Version 1 has no implicit rotations, mirrors, recursive repeats or arbitrary code. Directional states must be explicit. Later rotation support needs exhaustive state-aware tests, not just rotated coordinates.
- Operations within a component execute in order; later writes replace earlier writes by that same component. This supports a wall followed by its windows/openings.
- Any final coordinate claimed by two components is rejected, even if their block states match. Shared structure must have one explicit owner. Do not silently choose a winner based on array order.
- Missing cells mean untouched in a managed world edit; explicit air means clear. Count explicit-air cells toward the write budget.
- Validate both named clearances and supported state syntax. Server registry validation remains required before export or placement; pure compilation alone cannot certify registry validity.

Implemented resource limits: at most 48 x 64 x 48 cells of bounding volume, 10,000 final write cells, 256 components, 4,096 expanded primitive operations, 100,000 attempted cell writes, and a 1 MiB input document. These are independent ceilings: overlapping operations can be expensive even when their final map is small. Limits are checked during parsing/expansion with overflow-checked arithmetic. Measure and adjust through fixtures, not by silently relaxing production configuration.

### Artifacts and first implementation surfaces

Produce a normalized plan, a sorted cell/state map, a component ownership map, counts/bounds, validation diagnostics, and a content hash that includes the schema/compiler version. The hash uses normalized data, not compressed schematic bytes or timestamps.

Original decomposition below is a design guide, not a list of implemented classes. Current validation and compilation live in `PlanInput`, `PlanCompiler`, and `PlanCli`; browser comparison computes the visible cell-state diff, and apartment regression tests also check ownership preservation.

Potential future cohesive units under the existing Java package:

- `plan/BuildingPlan`, `PlanParser`, `PlanLimits`: typed input and validation.
- `plan/PlanCompiler`, `CompiledPlan`: pure expansion, ownership and deterministic output.
- `plan/PlanDiff`: differences between two valid revisions of the same plan.
- Existing `BlockGrid`: shared typed grid validation, preserving legacy JSON behavior.
- Existing schematic exporter and isolated smoke harness: consume compiled output and round-trip the artifact.
- `tests/fixtures/plans/`, a Java plan probe and `tests/test_building_plan.py`: generic reproducible examples.

Start with hand-authored fixtures, then a reference-informed design. Package A can compile and diff offline, but the current exporter resolves states through the running Paper registry. Use the isolated harness for `.schem` generation; do not claim a standalone headless exporter yet. Keep interactive generation commands unchanged in this package.

A schematic's unspecified clipboard cells are air. Therefore `.schem` alone does not preserve the distinction between untouched and explicitly cleared space. Managed execution must use the compiled write mask/manifest, not infer authority from the entire clipboard rectangle. Manual test pastes belong only in a disposable, known-empty plot.

### Tests to write before implementation

- Reject malformed versions, unknown operation/field names, fractional coordinates, duplicate IDs, missing palette roles, invalid bounds and unsupported states.
- Prove repeat expansion, half-open boundaries, explicit-air openings, per-component operation order and cross-component conflict rejection.
- Reject integer overflow and expansion/volume/input limits before large allocations.
- Compile the same normalized plan repeatedly to identical states, owners and hashes.
- Preserve explicit stair/slab states; check registry rejection and schematic round-trip in Paper.
- Diff a single facade revision, an added component and a removed component; preserve every unrelated cell and ownership entry.
- Keep all legacy grid/client regressions passing.

Exit gate: one compact fixture can be reviewed in the browser, including a second revision with an explainable cell diff; the selected revision exports and round-trips. Browser massing mode is not certification of detailed block shapes. This gate does not claim player interaction, crash recovery, architectural quality or autonomous design.

## Work package B: bounded jobs in an isolated world

Before exposing write tools, separate placement from the current one-shot command. The first executor permits one active write job in one reserved test plot. This deliberately excludes arbitrary live-world edits.

Proposed lifecycle:

```text
validated plan -> preview + target snapshot -> approved immutable change set
               -> prepared -> applying -> verifying -> completed
                                  |           |
                                  +--> paused / partial / conflict
                                              |
                                       explicit recovery or rollback
```

Each approval binds the actor, world UUID, plot bounds, baseline snapshot, plan revision, change-set hash and limits. A revision, changed target, expired approval or stale snapshot invalidates that approval. Previewing does not grant write authority.

Jobs need a persisted ID, idempotency key, before/intended/observed states, component ownership, operation cursor and event log. The proposed local store is SQLite behind an injected repository interface; the Java driver would be a new dependency requiring approval before implementation. Begin pure lifecycle tests with an in-memory fake. No live-data migration is authorized by this scope.

World reads, precondition checks and writes stay on the server thread; parsing, pure geometry and durable I/O use detached data off-thread. Paper warns that world access is generally unsafe from asynchronous tasks. [Paper scheduling](https://docs.papermc.io/paper/dev/scheduler/)

Before each bounded batch, durably record its intent off-thread, then revalidate the world preconditions on the server thread before applying it. Record observed outcomes after flushing. Never wait synchronously for storage from the tick loop. Cancellation stops future batches; it does not pretend completed changes disappeared. Startup leaves interrupted jobs paused for reconciliation, not automatically replayed.

Use both a change-count ceiling and an elapsed-time target per batch. Measure the whole batch, including session close/flush and readback. These are cooperative limits, not hard real-time guarantees; chunk loads, neighbor updates and one expensive call can exceed the target. Do not wrap an unbounded paste in a timer and call it scheduled construction. WorldEdit buffers/reorders work and flushes queues when sessions close. [WorldEdit edit sessions](https://worldedit.enginehub.org/en/latest/api/concepts/edit-sessions/)

For revisions, compile both plans and compare their final maps. A cell removed from plan ownership restores its captured original world state, not blindly air. A rollback restores only states still matching the recorded post-edit state; later conflicting edits are left untouched and reported. Equal-state comparisons cannot detect a later edit that changed a cell away and back, so they are not proof of ownership. Crash windows and ambiguous reconciliation require a paused/manual-review state rather than invented certainty.

Initial execution restrictions: loaded, reserved test plot; explicit world/height bounds; no entities, inventories, block-entity changes, fluids, falling blocks or active redstone. Define a tested block allowlist, support/placement ordering and side-effect policy before world trials. Intended-cell records alone do not capture physics, neighbor changes or another plugin's effects. Backups remain necessary; production rollback is not claimed until those boundaries are tested.

Tests: repeated requests, stale approvals, interleaved world edits, partial failures, cancellation, permission failures, restart between every journal/apply step, storage failure, restoration of removed components and conflicting rollback. Actual player placement/undo and load checks from [verification](verification.md) remain separate gates.

Exit gate: apply, interrupt, inspect, resume/reconcile and roll back the fixture in an isolated world, preserving a deliberate unrelated edit. Record tick-time distribution and batch durations under a documented test load; agree numerical performance thresholds from that baseline before raising scale.

## Work package C: observation and bounded iteration

Start supervised: a planning client produces or revises the plan and invokes the same tested service operations. An independently running model service and a visible avatar are optional later modes, not prerequisites for testing design quality.

Proposed service operations, independent of eventual transport:

| Operation | Result and boundary |
| --- | --- |
| `inspect_plot` | Bounded detached snapshot and exclusions; no writes |
| `validate_plan` | Diagnostics, counts and compiled hash; no writes |
| `preview_revision` | Diff, artifacts and exact baseline binding; no writes |
| `apply_approved_revision` | Idempotent job ID for an authorized immutable diff |
| `inspect_job` / `cancel_job` | Observed progress / stop scheduling future batches |
| `capture_views` | Images tagged with camera, time and observed revision/freshness |
| `rollback_job` | Preview then authorized conflict-aware reverse changes |
| `export_schematic` | New artifact ID, never an unrestricted filesystem path |

Implement the internal service boundary before selecting a network transport. Do not expose raw console/RCON, arbitrary commands, file access or unrestricted world editing as model tools. Any network adapter requires authenticated identities, server-enforced plot permissions, bounded inputs and private deployment configuration. A model-provided actor name is not authentication.

For the first trial, use a fixed set of street-level, oblique, roof and interior views plus exact checks of the supported walking model (headroom, support and connected routes). Render freshness must be demonstrated after a changed revision; a screenshot request completing is not proof the render updated. Manual client screenshots are an acceptable initial observation adapter. Automated capture is a separate integration gate.

Begin with a maximum of three supervised revision cycles per trial. Model choice, credentials, call/token ceilings and any monetary budget remain explicit operator decisions before paid inference; no spend is authorized here. Persist the plan, tool results and usage so a failed cycle can be diagnosed without repeating paid work. Stop on unmet preconditions, missing fresh evidence, exceeded budgets or repeated failure; return the reason, not another speculative edit.

Exit gate: the client can request a specific entrance/facade revision, inspect its fresh result and retain unrelated components. The user evaluates the result against supplied references; model self-scoring is only supplementary.

## Work package D: scale and optional embodiment

Only after the compact trial: larger residences, richer stairs/roofs and material transitions, reusable interiors, multi-building sites, neighborhood constraints and independent operation. Increase plan volume, write budget and concurrency separately with tests. Component boundaries should enable a larger building to be revised in parts; that does not make all parts independent of circulation or structural interfaces.

A visible walking avatar can later provide tours and inspection. It is not the initial bulk-construction mechanism. Account access, navigation reliability and observation fidelity require separate trials. A mesh/Blender path is also deferred: it adds voxelization and block-state interpretation without solving revision ownership or world recovery.

Out of the first release: whole-district generation, autonomous live-world deployment, survival gathering, arbitrary geometry/code execution, functioning hospital/business simulations, automatic canon invention, custom rendering, and block-entity content such as written signs/books or stocked chests.

## Decisions and next gate

Review apartment R1 in the browser and revise from user feedback. Before moving toward world execution, inspect the selected artifact with a player in an isolated plot, verify final block behavior/appearance, then implement package B's bounded lifecycle tests. Continue collecting user references without freezing the current examples into a universal style rule.

Decisions needed at later gates, not blockers to pure compilation: showcase type and plot; exact materials/resource pack; screenshot capture route; persistence dependency; operator permissions and retention; model access/budget; and measured live-execution limits. None is silently supplied by the current screenshots.

The first delivery creates a local read-only preview server, but no agent endpoint, autonomous worker, model integration or live deployment. See the [verification record](verification.md) for what has actually been tested.
