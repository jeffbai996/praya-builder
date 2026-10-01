# Address-aware project library — September 28, 2026

The first register increment is implemented in Builder's Design library. It remains a design register, not a complete municipal land or building register.

## Delivered

- Search across design names, existing survey names, street numbers, streets, units, municipalities and neighbourhoods. Filter by building type, municipality, recorded address, linked survey or unassigned study; sort by recency, name or address.
- Keep editions grouped by design identity. Location details belong to each existing `plan_id:siteId` application; copying a design to another survey does not copy its address. Filtering to an address opens the matching site's working draft.
- Optional street number, street, unit/suffix, municipality, neighbourhood, source note and verification status. Verified addresses require a street and source. The initial records contain no invented addresses or municipal assignments.
- Stable location IDs derived from existing application identity, independent of display-name changes. Metadata is stored separately under `.workspace/project-locations/`; original drafts, revisions, surveys and artifact hashes are not migrated or rewritten.
- Paginated summary API at `GET /api/workspace/library/projects`. It returns at most 24 design cards (six by default), without plans, block arrays or history. `GET /api/workspace/library/projects/:planId` retrieves compact edition summaries on demand. `POST /api/workspace/library/locations/:id` updates only metadata with an expected version and the existing write/origin guards.
- Server-side summary cache invalidates when source files change. It retains small projections, not full plans/surveys. The initial cold read still scans existing records; this is not a database-backed spatial index.
- Location dialog, source/status labels, persistent reload behavior, stale-edit conflict handling and phone layouts.

## Scope and remaining work

Existing saved surveys supply Minecraft world identity and X/Y/Z; their envelopes are not legal or official parcel boundaries. No boundaries, geocoding, government institutions or addresses are inferred from a design name. No Minecraft writes occur in this feature.

Future increments still need independent building/parcel/address records (including buildings without generated designs), verified address ingestion, multiple entrances/addresses for an application, a parcel map, boundary provenance and merge/split history. Current per-application location metadata is an incremental foundation for those records, not their replacement. The richer schema remains in [the register proposal](praya/proposals/land-and-building-register.md).

## Verification

`node --test preview/check-project-register.cjs` exercises 305 projects, bounded responses, cache invalidation, grouping, cross-site isolation, matching-address draft selection, unknown/stale edits, provenance validation, restart persistence and immutable source records.

`preview/check-project-register-browser.cjs` starts an isolated workspace/server and checks HTTP guards, pagination, address editing and persistence, lazy saved-version links, search and combined filters, two-editor conflicts, dialogs and page widths at 320/390/768/1440 pixels. Fixture addresses are synthetic and never written to the live workspace.

The register, Roadwork, revision-review and existing design-service checks pass together. Browser checks cover the new register and Roadwork save/reopen/export workflow. Roadwork's phone review table now scrolls inside its panel instead of expanding the whole page.

The staged component revision backend is checkpointed with focused tests; its Studio candidate comparison/acceptance UI remains unfinished. Roadwork's real in-game corridor proof remains outstanding.

## Deployment evidence

Build `b20260928.01` is served by `builder-studio.service`. Studio and Roadwork returned HTTP 200 through the normal Tailscale HTTPS origin after deployment. Only the Builder web service was restarted. Live read-only browser checks passed at 320, 390, 768 and 1440 pixels, including the location dialog and absence of browser page errors.

The live library has 16 grouped designs; its first six-card summary response measured 9,411 bytes. All 138 existing draft, revision, site, artifact and Roadwork JSON records matched their pre-deployment hashes, with no additions. Address-write tests used an isolated workspace, not live Praya records.

Git checkpoint status: changes are staged. The local `cc-secret` hook rejected the initial commit on `praya_canon` matches in fictional Praya text. A one-time override has been requested from the user; no override or push has been performed. Unrelated style-pipeline documentation and generated review evidence remain outside this staged checkpoint.

## September 29 follow-up and handoff completeness

Alder House and Terraced Residences were missing the thumbnail files for their current saved versions. Those exact-version JPEGs have now been generated, cached and visually verified in the live library; both HTTPS thumbnail requests returned 200. No geometry or saved revision was changed.

`preview/generate-workspace-thumbnails.cjs` is a bounded maintenance command for 1–24 explicit design keys. It uses the existing saved-version renderer, checks artifact identity, skips existing images, writes through the thumbnail API and verifies cached JPEG readback. Example: `node preview/generate-workspace-thumbnails.cjs alder-house terraced-brick-residences` (with the usual `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH` and optional `PREVIEW_TEST_URL` environment settings).

**Still open:** automatic thumbnail generation when external agents save versions. The backfill command does not add a save-time job queue; future externally saved revisions may still require this command or a Studio visit. Add bounded, deduplicated background thumbnail jobs with retry rather than rendering all library cards on users' devices.

Other outstanding tracks have their own owning documents:

- [Sandbox designs and review gates](sandbox-designs-2026-09-26.md), including the September 27 Alder rear revision: Terraced's actual player walkthrough and remaining diagnostics, review before further Alder/Parcel C placement, and the separate bridge bounds for Parcel C.
- [Praya style/detail pipeline](praya-style-pipeline-2026-09-27.md): head inventory and end-to-end support, parking/streetscape motifs and style evaluation. This is a specification, not completed training or asset support; its source files remain outside this checkpoint.
- [Roadwork implementation](roadwork-minecraft-2026-09-23.md): surveyed corridor generation and export are implemented; terrain-aware alternative ranking and the actual Sandbox road/traversal proof remain outstanding.

The register's independent building/parcel/address records and map remain listed above. The component revision comparison/acceptance UI and the blocked local commit are also already recorded above. No additional undocumented product blocker was identified in this handoff check.

## October 1 cross-task audit

The `praya-designer` task completed two batches of five condo alternatives under `preview/designs/condo-five-2026-09-29/` and `preview/designs/condo-four-sides-2026-09-29/`. Each batch includes five saved immutable revisions and 82 review views; its `final-verification.json` records matching artifact hashes and no world writes. The second batch develops all four elevations and furnished room/terrace circulation. These saved proposals do not close in-game walkthrough or placement gates.

The same task repaired its new designs' thumbnails and changed `preview/studio.js` to fit the initial camera to the building and stop construction connectivity from blocking the editable Studio interface. The second batch's `library-verification.json` records all five designs ready and interactive with construction status deliberately stalled in a Chromium touch viewport. Physical iPad Safari remains unverified. The source changes were inspected during this audit; these browser checks are the other task's saved evidence, not a fresh browser run.

The newer `Praya Builder` task recorded municipal road corrections in `docs/praya/road-character.md`, studied the existing Praya Zoo and discussed broader in-game management under the proposed PrayaWorks name. These are canon, study and product-direction work, not implementation of a municipal register or agent/NPC construction workflow.

None of the following backlog items is closed by those changes:

- Automatic, bounded thumbnail jobs with deduplication and retry. Batch thumbnail repair remains manual.
- Studio component-candidate comparison and acceptance UI over the existing backend.
- Independent building/parcel/address records, verified ingestion, multiple entrances, map and boundary history.
- Roadwork terrain-aware ranking and actual Sandbox corridor/traversal proof.
- Head inventory, end-to-end head support and reusable style/detail evaluation.
- Outstanding Terraced walkthrough/diagnostics and Alder/Parcel C review gates.

Git HEAD at audit is still `48dd807`. The September checkpoint remains staged and uncommitted. Later Studio fixes and canon edits remain unstaged; generated condo directories remain untracked. The checkpoint patch deliberately excludes these other-task changes. No commit-hook override, push, service restart or Minecraft write was performed by this audit. Historical deployment counts above describe September 28, not the enlarged current library.

## Active backlog

The complete [Builder and Roadwork backlog](builder-roadwork-backlog.md) retains all six workstreams, checkpoint housekeeping and separate future directions. On October 1 the user selected municipal register (3) and Roadwork (4) as the current implementation focus; the other items remain open.

## October 1 implementation: Places and terrain-aware Roadwork

The selected next increments are implemented and deployed; see [the detailed implementation record](municipal-register-2026-10-01.md). `/places` adds independent parcel/building/address/entrance records, source-backed verification fields, version history, reviewed import and atomic lineage, linked surveys/designs, and an X/Z coordinate map with manual tracing. This does not seed or certify existing Praya parcels/addresses, provide BlueMap imagery overlays, or calculate legal subdivision geometry.

Roadwork adds a bounded terrain-fit search and explainable cost/rank across four alternatives, a compact two-roadway-plus-two-sidewalk slab section with explicitly provisional states, and shaped slab/stair rendering. Existing saved studies retain pinned assemblies. A real trial corridor, local material confirmation and player/vehicle traversal remain open.

Verification: 12 focused Node tests pass; the new isolated browser workflow plus existing register and Roadwork browser checks pass. The new workflow covers place creation/linking/import/tracing/reload, road section/terrain generation/save/reopen/model, and widths 320/390/768/1440. Live read-only browser checks cover Places, its saved-survey picker, responsive layout and the existing Design library. HTTPS `/places`, `/transport`, `/api/workspace/places` and `/api/health` returned 200 through the usual Tailscale origin.

Deployment: only `builder-studio.service` was restarted, after confirming zero active construction jobs. All 217 pre-existing draft/revision/site/artifact/Roadwork records retained their hashes; none were added. No live municipal records were seeded and no Minecraft changes occurred. Build identifier is `b20261001.01`.

The backlog now distinguishes delivered code from remaining real-data, BlueMap/subdivision and in-game proof work. Thumbnail automation, revision UI, reusable heads/style and earlier building review gates remain retained, outside this pass. The checkpoint remains staged/uncommitted; no commit hook override or push was performed. Other-task Studio/canon changes remain outside this checkpoint.
