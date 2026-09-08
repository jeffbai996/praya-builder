# Site survey and map-aware design

Status: roadmap addition, 2026-09-05; not implemented. User direction is to retrieve
selected parts of the Praya map so building design responds to the actual plot,
slope and surroundings, and later supports painted zoning. This adds a read-only
survey track; it does not authorize a live connection or placement.

## Intended workflow

```text
Select plot + context margin
    -> capture a versioned site snapshot
    -> inspect terrain, access and exclusions
    -> propose site-adapted building + foundations
    -> preview in the real surroundings
    -> review a separate, bounded construction change set
```

Later, painting a residential zone creates candidate parcels and design briefs.
Each parcel uses the same survey/design/review workflow. A zone is planning intent,
not permission to clear or fill every block inside it. Nearby proposals must
reserve their footprints and share a current baseline before eventual placement.

## Feasibility and reuse

The current Java compiler already emits exact block states and the browser renders
them. `SchematicPlacer` exports generated geometry, but does not survey the world.
The missing pieces are an input adapter, a site-context contract, terrain analysis
and a separate contextual rendering layer—not a replacement building compiler.

Paper exposes read-only chunk snapshots containing block data, biome data and a
capture tick; snapshots can be processed away from live world objects. Its height
lookup is the highest non-air block, not a ground classifier.
[Paper ChunkSnapshot API](https://jd.papermc.io/paper/1.21.11/org/bukkit/ChunkSnapshot.html)

WorldEdit can copy a selected region into a clipboard and save/load it as a
schematic. This supports a file-based first import; the new importer and coordinate
manifest still need implementation.
[WorldEdit clipboard and schematic API](https://worldedit.enginehub.org/en/latest/api/examples/clipboard/)

## Data to retrieve

Keep four distinct records, linked by immutable IDs/hashes:

- **Source snapshot:** source/world identity, dimension, data version, capture
  start/end and per-chunk capture information, exact bounds, state palette and
  block cells. Record missing chunks and clipped vertical coverage explicitly;
  unknown data is not air. A multi-chunk survey is not automatically atomic.
- **Plot definition:** editable polygon, vertical limits, a separate read-only
  context margin, exclusions, local origin, rotation and world-coordinate
  transform. Preserve negative coordinates and elevation; do not reset each
  column to zero or lose the original anchor when importing a schematic.
- **Derived site report:** ground candidates, slope and elevation range, surface
  water, vegetation, occupied volumes and nearby building heights. Include
  entrance/road connection points and their levels, with provenance and uncertainty.
- **Planning annotations:** confirmed frontage, roads/paths, protected trees,
  existing buildings, district references, intended use and operator-supplied
  zoning constraints. Block patterns may suggest these labels, but do not prove
  ownership, plot boundaries or planning rules. User confirmation can override
  an inferred classification without modifying the captured blocks.

Raw blocks stay in the local site store. A design agent receives a compact site
report, views and bounded detail queries, rather than the whole city in a prompt.
Private maps, coordinates and captures stay outside public fixtures/source control.
Exclude entities, inventories and sign/book contents from the initial survey.

## Terrain-aware proposals

A roof, canopy, bridge, cave or tree can make a single height map misleading.
Keep exact voxel evidence in the plot and the relevant subsurface band; mark
ambiguous terrain for review rather than claiming buildable ground. Rendered map
views or screenshots can assist navigation and style reading, but are not the
authoritative collision or elevation record.

Use the surveyed access level to choose the entrance and orientation. Compare
stepped foundations, split-level floors, retaining walls, raised structures or
limited grading where appropriate. Each option reports the proposed cuts/fills,
excavation depth, retaining footprint, tree removal and collisions. Foundations,
grading and access paths are explicit owned components with their own limits.
An unsuitable plot can produce no viable proposal. Never flatten it implicitly.

Render **existing context**, **new building**, and **proposed removals/earthworks**
as separate layers. Preserve neighbours for visual scale without including them
in building exports, ownership or undo. Context is not a fake extension of the
building's block list: the existing mesh path caps artifacts at 48 × 64 × 48 and
10,000 cells. Larger surveys need independently bounded, tiled/context meshes and
level-of-detail work; do not relax the construction limits to display terrain.

## Delivery sequence and acceptance gates

1. **Offline single-plot survey.** Import one bounded terrain/neighbourhood
   schematic plus a manifest specifying source, world origin and plot polygon.
   A supplied consistent world backup is an alternative source, not permission
   to read a running world's region files. Start with synthetic fixtures; then
   use an operator-provided map extract. Produce a site report and contextual
   preview without world access or model calls.
2. **Terrain-aware design trial.** Fit one apartment to a sloping plot, preserve
   its street connection and exclusions, and compare foundation/level options.
   Revisions bind the survey hash and transform as well as the building hash.
   Review cut/fill and collision overlays before considering execution.
3. **Live read-only survey adapter.** A selected region becomes an authenticated,
   permission-checked survey job. Capture already-loaded, generated chunks in
   bounded server-thread work; analyse detached snapshots off-thread. Missing
   chunks fail or remain explicitly incomplete—no implicit generation, forced
   loading or teleporting a bot. Loading policy is a separate operator decision.
4. **Zoning overlay and parcel proposals.** Paint intent, suggest parcels, query
   context on demand and preview a small group of compatible buildings. Keep
   placement disabled until the existing bounded job/rollback gates are met.

Live world reads must respect Paper's thread restrictions; off-thread work uses
detached data, not live chunks or blocks.
[Paper scheduling guidance](https://docs.papermc.io/paper/dev/scheduler/)

Set explicit chunk, voxel, vertical-span, compressed/uncompressed byte, job-time,
queue and memory limits before implementation. An importer rejects malformed or
oversized data before large allocations. A survey job cannot invoke arbitrary
console commands or filesystem paths. Authenticate access to private map data
even though the operation is read-only.

Before any later write, recheck the relevant live baseline. An old cached survey
or offline export is design evidence, not proof the world is unchanged. Changed
terrain, paths, neighbours or reservations invalidate affected candidates and
their construction approval; a survey never grants write authority.

Tests before implementation: coordinate/rotation round-trips (including negative
coordinates and nonzero origin); flat, sloped, cliff and irregular plots; trees,
bridges, water, caves and unknown coverage; retained paths/exclusions; deterministic
reports and snapshot binding; stale or mixed-time captures; malformed/oversized
imports; cancellation and no world writes/chunk generation. Browser acceptance
checks context alignment, cut/fill overlays and unchanged neighbours. The first
real-site exit gate is a reviewable building on a correctly surveyed slope, not
autonomous city construction.
