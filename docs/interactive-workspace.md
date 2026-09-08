# builder: from review to authoring

Status: historical implementation plan, 2026-09-04. Build 20260906.01 implements the first site-aware authoring and isolated execution workflow with a local file store. See [current behavior and API](site-design-workflow.md); the remaining collaboration/provider stages below are future work.

Expanded product direction, 2026-09-05: [the department workspace roadmap](department-workspace.md)
connects this authoring work to map/sites, shared case review, inspections and a
confirmed building register. This document remains the detailed editor/service
plan, not a separate competing roadmap.

## Product and canon

The product wordmark is **builder**, set in DM Sans, with **Buildings Department** and the build number as supporting identification. Urbanist supplies headings. Dark mode is neutral charcoal, not a green/blue departmental palette. Department context belongs in the workflow, not repetitive warning badges. The Live/Offline indicator measures the connection to the builder server; it does not indicate a Minecraft server connection.

Canon source: the rendered [Buildings Department portal](https://www.govpraya.org/bd), inspected on 2026-09-04. It identifies permits, inspections, building-code enforcement, and construction safety as department functions. Its review sequence runs from plan checking through inspection to occupancy, and it names RPBC 2024 as the code edition. The page also describes digital submission of 3D models and automated plan checking. These support an internal design-review workspace; they do not establish our own templates as compliant buildings or define machine-readable zoning rules. The [government directory](https://www.govpraya.org/) separately lists Interior and Housing Authority responsibilities; do not merge their powers into this tool.

Keep sourced canon, user design preferences, and proposed product behavior distinct. Do not invent fees, permit decisions, parcel ownership, numeric code limits, or district locations. New proposals currently use unassigned synthetic sites.

## Already interactive

Nine project files and seventeen immutable artifacts; searchable project register; same-project revision comparison; block/component picking; floor cutaways; material schedules; camera controls; PNG views; deep links; persisted theme; and browser-local, hash-bound review notes/dispositions with JSON export. The notes are not a shared case-management database. A changed artifact gets its own note record.

Build 20260905.05 adds full-revision `.schem` and source-manifest downloads,
component focus, fit-to-view, an expanded viewport and lighting/grid controls.
The [export workflow](schematic-export.md) is implemented; parameter editing below
remains the next authoring increment. These inspection controls do not edit plans.

## Parallel track: site selection and survey

Add a Site view alongside design review: choose/import a bounded map extract,
outline the plot, confirm road frontage and exclusions, and inspect terrain
levels and slope. Show existing surroundings separately from the proposal, with
survey age/completeness and cut/fill overlays. New drafts bind the site snapshot
and world transform. Do not offer zoning-triggered placement here.

The [site-context plan](site-context.md) sequences offline import, a slope-aware
design trial, read-only live retrieval and later map painting/parcel suggestions.
It can proceed without the parameter editor or a live construction agent. Saved
site annotations are future shared data, not today's browser-local review notes.

## Next delivery: bounded design editing

Start with the apartment template, not a general-purpose block editor. Select a facade, entrance, balcony, or roof component and expose only parameters the template can safely regenerate.

| Control | First scope | Required validation |
| --- | --- | --- |
| Materials | Named facade/trim/planter roles | Valid registry states; retained geometry and owner map |
| Balcony depth | Template-defined integer options | Plot bounds, clear entrance, support and clearances |
| Window pattern | Tested bay patterns, not arbitrary carving | Door openings and floor/partition interfaces preserved |
| Roof treatment | Tested canopy/garden alternatives | Stair access and headroom retained |
| Floors and unit layout | Later parameter family | Regenerate circulation, rooms and services together |

A control changes a draft, never the reviewed revision. Keep the current view and show a candidate overlay/diff while compilation runs. Debounce control changes, cancel obsolete work, and never label an old mesh as the latest candidate. Invalid input keeps the reviewed baseline available and marks the candidate invalid. A reviewer can discard the draft or explicitly save a new revision. Provide draft-level undo/redo before world-level undo is considered.

First acceptance: change facade material and balcony depth, see a valid candidate from the same camera, inspect the exact changed cells, undo/redo the draft, save a successor revision, reload it, and prove the baseline artifact and unrelated components are unchanged. No model credentials or world access are needed.

## Implementation boundaries

1. Extract template parameters from the authoring helpers into versioned descriptors: type, label, unit, bounded choices/range, default, affected components and coupled parameters. The server owns the descriptor and compiler contract. Never accept browser JavaScript or arbitrary filesystem paths.
2. Add a design service separate from the static preview HTTP handler. It invokes the existing Java compiler through a bounded worker queue. Restrict input bytes, final cells, attempted writes, queue depth, concurrency and runtime. Results include diagnostics, artifact hash, component/state diff and source template version.
3. Persist project revisions, parameter snapshots, parent hashes and draft events. SQLite is the proposed store; choose/approve its driver before implementation. Keep generated artifacts content-addressed and immutable. Database rows reference artifacts rather than duplicating mesh arrays.
4. Add authenticated author/reviewer identities, mutation permissions, CSRF/origin checks and audit records before enabling server-side writes. The current Host allowlist is not authentication. If Tailscale identity headers are used, trust them only from the configured proxy and prevent direct client spoofing. Keep public Funnel disabled.
5. Use optimistic concurrency: a save names its baseline hash and idempotency key. A stale baseline creates a conflict, not a silent overwrite. Duplicate requests return the same result. A saved revision records the parameter/template/compiler versions required to reproduce it.

Proposed service operations (not current endpoints):

```text
create_draft(project, baseline_hash, template_version, parameters)
update_draft(draft_id, expected_version, parameter_patch)
compile_draft(draft_id, expected_version) -> job + candidate artifact
inspect_candidate(job_id) -> diagnostics + diff + hash
save_revision(draft_id, candidate_hash, idempotency_key)
discard_draft(draft_id, expected_version)
```

Use a narrow parameter patch, not arbitrary JSON pointer mutation of ownership/authority fields. Initial rendering and exports continue to consume the same compiled artifact. No second geometry implementation is introduced in the browser.

## Following deliveries

**Component annotations and shared review.** Pin comments to component ID plus block position, camera and artifact hash; record whether they are resolved, superseded, or orphaned by a revision. Import today's local review JSON only after previewing its project/hash binding. Synchronization should be explicit; do not silently upload browser notes. Add accessible keyboard navigation, selected-component views and a printable review sheet.

**Plan checking.** Add a diagnostics panel with exact cells, severity, rule version and provenance. Separate implemented geometric checks (bounds, routes, headroom, unsupported states) from department-code checks. RPBC labels alone are not code enforcement: numeric rules require a sourced and approved ruleset with fixtures and documented exceptions. Separate reviewer disposition from construction approval.

**Assisted revisions.** A future model proposes the same bounded parameter patches and component plans a human can review. Show its proposed change, compile it, and require explicit acceptance. Credentials, model choice, usage limits and spend authorization are separate decisions. No model call should be triggered merely by opening a project.

**Isolated construction and inspection.** Connect only after the [bounded job lifecycle](build-system-scope.md#work-package-b-bounded-jobs-in-an-isolated-world) exists. Preview a reserved plot, bind approval to world/plot/baseline/artifact, schedule bounded writes, inspect exact outcomes, and support pause/conflict-aware recovery. A successful browser review is not an instruction to paste into a live world. Game inspection evidence can eventually attach to the case record; final release/occupancy remains a separate department workflow.

## Tests and sequencing

- Pure parameter validation, determinism, unchanged-component preservation and template-version migrations first.
- Draft undo/redo, failed compile, rapid edits, stale responses, duplicate saves and concurrent-editor conflicts next.
- Persistence round-trips, restart recovery, storage/quota failure and missing artifacts before shared use.
- Browser tests for keyboard selection, parameter controls, dirty-state recovery, themes, baseline overlays and notes tied to old/new revisions.
- Server mutation tests for identity, project permissions, origin/CSRF boundaries, request budgets and non-executable inputs before exposing editing routes.
- Schematic round-trip of a saved edited artifact and a player test in an isolated plot before execution integration.

Keep the current review workspace usable throughout. Ship the first parameter editor and immutable revision-save path before collaborative annotations, freeform drafting, agents, or world placement.
