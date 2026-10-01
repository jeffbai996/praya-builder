# Builder and Roadwork backlog

Updated: 2026-10-01. This is the shared backlog index. Detailed contracts and evidence remain in the linked owning documents. A checked item means verified completion, not merely a proposal or code change.

## Current focus — user selected items 3 and 4

### 3. Municipal land, building and address register

October 1: [implementation and verification](municipal-register-2026-10-01.md). Coordinate map and independent records delivered; actual source ingestion and richer basemap/subdivision work remain.

Owner: [register proposal](praya/proposals/land-and-building-register.md). Existing increment: [address-aware Design library](project-register-2026-09-28.md).

- [x] Group design editions, search/filter library summaries, and maintain separate per-application location metadata.
- [x] Independent stable building, parcel and address records, including existing buildings with no generated design.
- [x] Multiple buildings per parcel and multiple addresses/entrances per building; preserve Minecraft world and X/Y/Z identity.
- [ ] Ingest existing addresses with source evidence, review and verification; do not invent numbering or infer addresses from names/proximity.
- [x] Coordinate-map selection and manual boundary tracing/editing in Minecraft X/Z.
- [ ] Verified BlueMap basemap/overlay and richer spatial navigation.
- [x] Survey links and dated evidence, boundary provenance, revision history and atomic merge/split lineage via reviewed import.
- [ ] Guided geometric subdivision/merge editing and boundary conservation checks.
- [x] Link design applications to places while retaining unassigned studies and immutable saved artifacts.
- [x] Verify API integrity, conflicts, persistence, bounded responses, desktop/mobile workflows and preservation of existing records.

Survey envelopes are not official parcel boundaries. Unknown and proposed boundaries must remain explicitly labelled.

### 4. Roadwork

Owners: [implementation](roadwork-minecraft-2026-09-23.md), [transport handoff](transport-builder-handoff-2026-09-11.md), [municipal road character](praya/road-character.md).

- [x] Survey-bound deterministic corridor generation, segmented artifacts, saved studies, review and schematic/manifest export.
- [x] Compare and rank alternatives against surveyed terrain with explainable metrics; bounded local terrain search and actual change-cost ranking now supplement geometric alternatives.
- [x] Support a two-block-wide slab roadway with one sidewalk block per side, using explicitly provisional top-slab materials.
- [ ] Confirm exact local materials, slab states and exceptions against a real reference.
- [x] Render slab/stair geometry accurately enough to review the proposed section.
- [ ] Preserve municipal variation: ground-set lights are specific to the City of Braemar, not a universal standard.
- [x] Verify changed templates, joins, source-state preservation and saved-study compatibility through engine/API/browser checks.
- [ ] Choose and survey an actual Sandbox road trial corridor, review its construction package, then verify placement and walk/drive it with actual server mechanics.

No trial corridor has been selected. Real-world placement remains separately reviewed; browser checks and exports do not prove traversal. Intersections, bridges, portals, vehicle mechanics and neighborhood-wide street/plot orchestration are subsequent scope, not implied complete by a corridor generator.

## Retained backlog — not the current implementation focus

### 1. Automatic saved-version previews

- [x] Bounded explicit-key thumbnail repair command; named Alder/Terraced previews repaired.
- [x] Other designer task repaired the ten new condo previews.
- [ ] Bounded background thumbnail generation for externally saved versions, with deduplication, retries and restart recovery.
- [ ] Verify newly saved versions obtain previews without opening Studio and without rendering all cards on the user's device.

### 2. Component revision review in Studio

- [x] Staged backend for submitting, validating and accepting revision candidates.
- [ ] Compare baseline and candidate, changed components and diagnostics in Studio.
- [ ] Accept a valid candidate as an immutable saved version; show stale/conflicting requests clearly.
- [ ] Verify the complete interface workflow, including invalid and stale candidates.

### 5. Reusable Praya details and style evaluation

Owner: [style/detail pipeline](praya-style-pipeline-2026-09-27.md); authority: [Praya index](praya/README.md) and [building style](building-style.md).

- [ ] Inventory the existing decorative heads and establish reusable asset identity/provenance.
- [ ] End-to-end supported head preview, export, placement and readback.
- [ ] Reusable parking, streetscape and building-detail motifs grounded in actual references.
- [ ] Reference-based style evaluation, including all elevations, interiors, signage and regional variation.

Individual detailed designs demonstrate progress, not completion of this reusable system. The latest five four-sided condo alternatives explicitly use no custom heads.

### 6. Building review and in-game proof

Owner: [Sandbox design review gates](sandbox-designs-2026-09-26.md).

- [ ] Terraced Residences: actual player walkthrough and remaining diagnostics.
- [ ] Alder House: review before further placement.
- [ ] Parcel C: review and separate placement-bridge bounds work before placement.
- [ ] New condo alternatives: any future placement/walkthrough remains distinct from their existing saved-artifact and render checks.

### Checkpoint housekeeping

- [ ] Resolve the blocked Git checkpoint without silently bypassing the commit hook. Current checkpoint remains staged/uncommitted; fictional canon triggered `cc-secret`.
- [ ] Intentionally checkpoint later Studio fixes and generated designs, preserving other tasks' work.
- [ ] Refresh the handoff snapshot and reviewable patch whenever deployment or completion status changes.

## Verified follow-up work already recorded

The designer task added ten saved condo alternatives, initial building camera fitting and non-blocking construction connectivity in Studio. Saved browser evidence covers opening the new designs with deliberately stalled construction status. Physical iPad Safari and world placement are not established by those checks. See the October 1 audit in [the handoff](project-register-2026-09-28.md).

## Separate future directions

- PrayaWorks: broader in-game management, natural-language inspection/design, plot context, previews, paced construction and optional NPC interaction. Product direction only; not an implemented handoff deliverable.
- Finish Praya Zoo: a saved-world study and proposed finishing sequence exist in the separate Praya Builder chat. Live survey, design, review and construction remain separate steps.

These directions remain visible here but do not expand the current selection of register and Roadwork work.