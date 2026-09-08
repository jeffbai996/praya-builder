# builder: Buildings Department workspace

Status: product roadmap, 2026-09-05. User direction expands builder from a design
viewer into an all-in-one Buildings Department tool. The wordmark remains
**builder**; this document plans future capabilities, not implemented screens or
new departmental powers.

## Organising principle

One building project connects its site, brief, references, design revisions,
checks, review decisions, construction jobs, inspection evidence and eventual
as-built record. Staff should open the same case from the map, project register
or review queue without recreating that context in separate tools.

Keep a **site/parcel**, a **project**, a **proposed design** and an **existing
building** distinct. One site may contain several buildings; a building may have
many alteration projects over time. A nice render is a proposal, not an as-built
record. Reading the map must not silently register every structure as approved.

## Product areas

| Area | Useful capabilities | Prerequisite or boundary |
| --- | --- | --- |
| Map and sites | Select plots; retrieve terrain and neighbours; measure distances/elevations; mark frontage, access and exclusions; inspect slope and parcel overlays | Versioned read-only [site surveys](site-context.md), coordinate fidelity and confirmed annotations |
| Project files | Brief, intended use, site link, district references, tasks, attachments, revision history and shared case notes | Stable IDs, persistence, permissions and audit history; current local notes are not shared records |
| Design studio | Existing block preview plus bounded parameter editing, alternative schemes, sections, material schedules and reusable furnishings/facade components | Same deterministic compiler; immutable revisions; preserve camera and unaffected components |
| Plan checks | Plot fit, collisions, entrances, routes, headroom, foundations and cut/fill; later sourced setback/height/coverage rules | Show actual diagnostics and rule versions; distinguish geometry checks from departmental code decisions |
| Reviews and permits | Review queues, component-pinned comments, requests for changes, submissions, decisions and inspection conditions | Reviewed artifact/survey binding; approved canon workflow and role checks before formal permit records |
| Construction and inspection | Approved change-set preview, bounded job progress, pause/recovery, site photos, checklists, defects and reinspection | Isolated executor gates first; separate read, design, review and world-write permissions |
| Building register | Confirmed building identity/location/use, as-built survey, approved plans, alteration history, condition observations and repair follow-up | Evidence and provenance; do not mistake the proposal catalogue for a verified city inventory |
| Standards and references | Searchable district examples, palettes, signage rules, reusable details and versioned checklists | Separate user taste, observed examples and authoritative rules; retain corrections and rejected precedents |

Cross-cutting features worth building once: global search, filters/saved views,
case activity history, linked issues, reproducible document/view exports, and an
inbox of actionable reviews or failed jobs. Counts and statuses must come from
real records; avoid decorative dashboards with invented activity.

Later additions can include sun/shadow studies, neighbour-impact comparisons,
bulk condition surveys and district-scale scenario previews. Those require
their own model assumptions and validation; they are not needed for the first
site-aware building trial. Paintable zoning belongs in Map and sites, producing
parcel/design proposals before any automatic construction is considered.

## Shared record and state boundaries

A case references immutable survey and design versions, not just their latest
files. Comments and issues bind a component/location plus evidence version;
changed geometry can supersede a comment rather than silently move it. Keep
before/intended/observed states for construction separate from design history.

The future workflow can progress from draft to submitted, changes requested or
design accepted, then separately through authorised construction, inspection,
remediation and a confirmed as-built record. This is proposed product behaviour,
not a declaration of official permit stages. Design acceptance is not permission
to edit the world, and a successful build job is not an occupancy decision.
Neither the model nor a screenshot can approve its own work.

Use shared project services and a proposed local SQLite store rather than
unrelated databases per screen. Driver selection requires approval before adding
a dependency. Backups, artifact retention, concurrency/version checks, role
permissions and audit events precede multi-user mutations. Import existing
browser-local notes only through explicit user action with hash validation.

Keep read-only observation available without giving the same service unrestricted
construction authority. Future zoning/right-of-way constraints can be imported
from the responsible source; builder should not invent land ownership or claim
that every planning function belongs to Buildings Department.

## Sequencing

1. **Site-aware project foundation:** bounded offline map import, survey report,
   plot overlay and a project-to-site link. First acceptance is one sloping plot
   rendered correctly with a proposed building and preserved street connection.
2. **Authoring and checking:** bounded editor, saved immutable alternatives,
   contextual comparison and explicit fit/collision/earthwork diagnostics.
3. **Shared department cases:** permissions, shared notes, component issues,
   review queues, provenance and version-bound decisions. Confirm formal permit
   semantics before exposing permit issuance or occupancy actions.
4. **Construction and field evidence:** isolated bounded jobs, fresh observation,
   inspection checklists, defects and conflict-aware recovery; then a verified
   building register linked to its source projects.
5. **District planning and lifecycle:** zoning/parcel proposals, multi-building
   reservations, confirmed as-built updates and condition/alteration workflows.

Retain the current review workspace throughout. Do not add empty modules to the
navigation until their underlying records and useful actions exist. Map retrieval
and project structure are the next foundation; this vision is not a request to
implement every module at once.

## Canon and verification

The department functions recorded in [the authoring plan](interactive-workspace.md#product-and-canon)
come from the portal inspected on 2026-09-04. A fresh request to the recorded
`/bd` URL returned HTTP 404 on 2026-09-05, so this update does not claim refreshed
canon or newly verified legal rules. All additional features above are user-led
product proposals. Reverify the current portal before formalising permit, code
enforcement or occupancy behaviour.

Implementation tests must cover linked-record integrity, immutable evidence,
state/permission transitions, concurrent reviews, restart recovery and the
distinction between proposed and observed buildings. Add served-page checks when
the actual navigation, map, editing and case interactions are implemented.
