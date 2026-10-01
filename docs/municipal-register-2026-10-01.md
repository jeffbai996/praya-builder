# Municipal register and Roadwork — October 1, 2026

The current implementation adds `/places` as Builder's land/building register and extends `/transport` with compact slab streets and bounded terrain comparison. The user selected backlog items 3 and 4; the complete [backlog](builder-roadwork-backlog.md) retains the other tracks.

## Places

- Independent stable parcel, building, address and entrance records. Existing buildings need no design. Links support multiple buildings, addresses and entrances and enforce exact Minecraft world/name identity.
- Search, kind/world/municipality filters, 24-record pages and a capped 500-feature X/Z map. Same-name worlds with different IDs remain separate. Unassigned designs remain in the existing Design library.
- Map pan, zoom, fit, feature selection and manual boundary tracing. This is a coordinate map, not a BlueMap imagery overlay. It does not discover or certify existing parcels.
- Source and verification status, observed/proposed/retired lifecycle, editable footprints/positions, linked surveys and designs. Survey evidence pins source, hash and capture date at each record revision. Survey envelopes are never automatically promoted to parcels.
- Reviewed JSON import, including verified addresses supplied from existing source evidence. Verification is a human/source assertion, not automatic geocoding or independent certification. No production addresses or parcels have been invented or seeded.
- Atomic versioned register updates, stale-write rejection, historical record snapshots and reverse related-place lookup. Split/merge provenance can be submitted through the reviewed JSON import: parents are retired and children linked in one transaction. Geometry is manually supplied; subdivision geometry/area conservation is not calculated or certified.

Storage is a separate `.workspace/municipal-register/register.json`, bounded to 16 MiB including history. Writes use a temporary file and rename under an exclusive lock. A process killed mid-write can leave `write.lock`; confirm no writer is active before removing that lock. Existing drafts, revisions, artifacts and survey records are not migrated or rewritten. This is a bounded file-backed register, not a spatial database. The optional survey/design picker currently lists up to 500 entries; existing linked IDs remain preserved beyond that picker limit.

API under `/api/workspace/places`: GET paginated summaries/map, GET `/:id` detail/history, GET `/sources` compact reference choices, POST `/validate` dry-run batch review and POST root atomic updates. Writes retain the existing origin/header guards. Records and transactions carry expected register versions. A lineage import uses `{records:[...newParcels], lineage:{type:"split"|"merge",parents:[...ids],source:"..."}}`.

## Roadwork

- Compact slab street: four cells across an axis-aligned section, comprising two roadway cells and one sidewalk cell on each side. Top stone slabs and top stone-brick sidewalk slabs are explicitly provisional material states awaiting a local reference. No ground lights are added.
- Existing odd-width concrete templates remain available. Old saved studies reopen their pinned assembly; generation does not rewrite saved studies.
- Terrain fit searches seven bounded lateral alternatives using surveyed solid-ground heights for intermediate points and fixed endpoint tie-ins. Candidates rank by issues × 1,000,000 + excavation × 4 + fill × 3 + replacement + length. All four interface alternatives display that cost and rank. This is an explainable local search, not a global route solver or civil-engineering certification.
- Slabs and straight/inner/outer stairs use shaped boxes in the 3D view and section drawing. Other context still uses simplified occupancy cubes. Non-water blocks with a waterlogged property retain their material colour.
- Saving pins section, input, source survey and exact assembly. Review/export guards remain in effect. Maximum voxel-step grade is labelled separately from the input alignment.

## Verification and deployment

Focused engine/API/register suite: 12 passing tests, including independent persistence, stale writes, provenance, cross-world rejection, self-intersecting boundaries, atomic lineage, import dry-run, 600-record pagination/map limits, exact axis-aligned compact width, deterministic terrain ranking and slab/stair shapes. Existing Roadwork schematic round trips and saved-survey snapshot checks pass.

Isolated browser checks pass for place creation, linking, import review, tracing, reload and Roadwork compact/terrain generation, save/reopen and block view. Layouts checked at 320, 390, 768 and 1440 pixels. Existing Design-library and Roadwork full-workflow browser regressions also pass. These checks use synthetic fixtures, not live Praya records.

Deployment/read-only live verification is recorded in the main handoff after completion. No Minecraft placement or traversal is proved by these checks.

## Still required

- Populate verified real-world records from Praya's actual signs/surveys, with the user resolving uncertain addresses and boundaries.
- Integrate a verified BlueMap basemap/overlay, richer spatial navigation, scalable persistent indexing and a guided geometric split/merge editor as the register grows.
- Confirm exact local road materials/states and vehicle behavior; test bends, slopes and joins in an agreed Sandbox corridor. No road trial location is selected yet.
- Neighborhood street graphs, automatic plot subdivision, bridges, junctions and portals remain later Roadwork scope.

Deployment verified October 1: `builder-studio.service` restarted with zero active construction jobs. Normal Tailscale HTTPS returns 200 for Places, Roadwork and their read endpoints. Live read-only browser checks pass for Places/reference choices and the Design library. All 217 existing draft/revision/survey/artifact/Roadwork hashes are unchanged, with no added records. No production register data or world blocks were written. Checkpoint remains staged, not committed.
