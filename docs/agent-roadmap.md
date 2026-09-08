# Iterative construction roadmap

New proposals and revisions follow the standing [building style rules](building-style.md),
including tinted-pane glazing, deliberate clear-pane exceptions and integrated signage.

## Current delivery: site-aware studio, 20260906.01

The approved next milestone is one plot through design, directed revision and
isolated placement. The [implemented workflow](site-design-workflow.md) now
provides bounded survey imports, three composed apartment studies, draft editing,
agent handoff, immutable saves and durable construction/recovery jobs. The
existing catalogue remains intact. Real-world plot selection and a player
walkthrough remain the acceptance boundary before a four-to-eight-parcel block.
The older priorities below are historical backlog, not the active sequence.

## Intended experience

Supply a brief, reference screenshots or selected buildings, and a plot. The builder surveys the context, plans the building, constructs a preview, inspects the result, and revises specific components. A revision such as “widen the entrance and replace the upper-floor windows” should preserve unrelated work.

## Near-term priority: useful design and export, before department expansion

User direction, 2026-09-05: improve building quality, fidelity and day-to-day UI
before expanding the all-in-one department/map roadmap. Build **20260905.05** now
delivers [browser schematic export](schematic-export.md), source manifests,
component focus, fit, an expanded viewport, lighting/grid controls and corrected
texture seams. All seventeen immutable building artifacts remain unchanged.

Build **20260905.06** adds actual revision thumbnails, OLED black, the department
outline mark, register filters/sorting/Records view, and all-elevation/interior
successors for Rosedale (R2) and Frame House (R1). Prior artifacts are preserved.

Next high-value increments, still proposed:

- Continue the all-elevation and room-layout pass through the remaining catalogue.
- Add legible floor plans, room labels and dimension/clearance overlays so interior
  review does not depend entirely on orbiting the model.
- Deliver the bounded material/balcony/window editor described in
  [interactive-workspace.md](interactive-workspace.md), with draft undo and saved
  successor revisions rather than mutating reviewed designs.
- Expand tested furnishing assemblies and entrance/service details; retain Praya's
  smoked-pane preference, facade depth, planted thresholds and integrated signage.
  Couple room layouts to circulation instead of adding decorative clutter.
- Add cell-linked generation diagnostics for doors, headroom, stairs and unsupported
  render states. Distinguish geometric checks from player tests and sourced code rules.
- Compare an exported building inside the user's game/resource-pack environment
  before claiming shader parity or operational interiors.

Map surveys, zoning and shared department records remain on the long-term roadmap;
this priority does not authorize a live-world connection or automatic placement.

## Product direction: an all-in-one Buildings Department workspace

Builder should cover the building lifecycle, not stop at render review: map/site
surveys, project briefs, design alternatives, plan checks, shared reviews,
construction/inspection evidence and confirmed building records. The
[department workspace roadmap](department-workspace.md) defines the modules,
shared case model and staged delivery. Site/project foundations come first;
formal permits, world execution and the building register each have separate
authority and evidence gates. Keep the product wordmark and current review UI.

## Long-term direction: zoning-led city building

The eventual product should let the user paint zones on the Praya map, in the
spirit of Cities: Skylines. Marking an area residential, for example, would lead
builder to propose fitting buildings and eventually place them in the city.
District character, plot context and the user's design choices should carry
through from individual-building work into that experience.

This is a deferred product direction, not a current implementation task.
Zoning, map painting and automatic placement are not implemented. Current work
continues on detailed, reviewable building proposals and the preview workspace.

### Prerequisite: read-only site context

Before map-aware design or zoning, builder must retrieve a selected plot and a
bounded margin of its surroundings. Capture exact block/elevation data, retain
the world-coordinate transform, and derive slope, obstacles, access levels and
neighbour context. Keep confirmed parcel/road labels distinct from inference.
Design foundations, entrances and grading against that survey, then preview the
proposal in place without changing the map.

The [site-context plan](site-context.md) defines an offline extract/import first,
a terrain-aware design trial, a later read-only live adapter, and finally zoning
and parcel proposals. Survey and construction budgets are separate. The live
world must be rechecked before eventual placement; neither a survey nor a painted
zone grants write authority. This track can advance before the placement agent.

## Component architecture

```text
Model agent / interactive client
             |
       bounded tool interface
             |
       building components ---- reference/style descriptions
             |
       deterministic block-state compiler
             |
       Paper / WorldEdit executor
             |
       block checks + screenshots
             |
       agent reviews and revises
```

The model should describe walls, floor layouts, repeating facade bays, roofs, and materials. Code expands repetition into exact block states. More freeform geometry can be supported without requiring the model to enumerate every final block in a single response.

The existing `BlockGenerator` interface separates the current model adapter from command/placement code. It still returns legacy grid JSON. A separate versioned component-plan compiler now powers authored browser-review artifacts; it is not wired to the generator command. An Astra adapter and an agent loop are not implemented.

## Proposed tools

| Tool | Contract |
| --- | --- |
| Inspect region/reference | Return a bounded, versioned site snapshot, terrain/access report, exclusions and relevant examples; no writes |
| Validate/preview plan | Check limits and produce a reviewable artifact without editing the live plot |
| Apply component | Apply a bounded change with a job ID and change record |
| Inspect changes | Return what actually changed and any failures |
| Capture views | Return exterior/interior images with render freshness information |
| Undo build | Revert a recorded job, accounting for subsequent edits |
| Export schematic | Save a validated standalone artifact |

Job bounds, component IDs, block budgets, cancellation, overlap detection, and durable change records belong in the execution layer. The current player WorldEdit undo history is useful groundwork, but is not durable job rollback or conflict resolution.

## Observation and embodiment

BlueMap can provide site/exterior views once changed chunks finish rendering. Exact block data checks circulation, headroom, dimensions, and placement. A real Minecraft client is preferable for final interior and resource-pack/shader appearance.

Mineflayer is an optional avatar/navigation layer. Bulk construction can remain in WorldEdit while the character walks through buildings or performs smaller actions. Authenticated servers require a suitable authenticated account and whitelist access. A fully independent service would also require model credentials and explicit usage budgets.

## Stages

1. **Foundation — implemented, interactive verification pending:** reproducible build, regression tests, strict grid validation, provider boundary, accurate block states, and player undo recording. Build, automated regressions, and registry/schematic smoke checks pass; actual player undo and load behavior remain unverified.
2. **Components — first review implemented:** deterministic floor/facade/roof compilation, a six-unit apartment R0/R1 browser viewer, selective cell diffs, and isolated schematic round-trip. Player/game-appearance checks remain pending.
3. **Site context — planned:** bounded map-extract import, surveyed terrain/neighbours, slope-aware previews, then a read-only live survey adapter. See [survey gates](site-context.md#delivery-sequence-and-acceptance-gates).
4. **Tools:** bounded editing in an isolated world, scheduling and job rollback; separate authority from survey reads.
5. **Feedback:** fresh screenshots plus exact checks, followed by selective revisions.
6. **Style:** derive proportion, palette, street-interface and district conventions from references.
7. **Optional operation:** visible Mineflayer avatar and/or independent API service, followed by the deferred zoning-led workflow.

## Current delivery and next gate

The browser now provides a multi-project **builder** workspace with nine proposals, seventeen revisions, local reviewer notes, material schedules, deep links and neutral dark mode. The catalogue includes irregular service buildings, a furnished mansion, a rebuilt six-storey apartment and a logo-led postmodern clinic. The next product tracks are [bounded parameter editing and immutable draft/revision workflows](interactive-workspace.md) and [read-only site context](site-context.md); both precede map-aware construction. Current proposals are still on synthetic sites.

The [building system scope](build-system-scope.md) specifies the first end-to-end trial, implemented plan contract, test gates, proposed execution limits and deferred decisions. Its package A has a working first delivery; bounded jobs and agent operations remain proposed.

The first showcase is a compact apartment. Its [browser preview](browser-preview.md) supports reviewing and revising the compiled design before exporting an approved schematic, rather than requiring a new in-game paste for every proposal. See [setup and controls](../preview/README.md).

The model-independent pipeline now compiles dimensions, material choices, component IDs, and repeated elements into exact owned block states. R1 adds planted balconies, a sheltered entrance, and frontage changes while preserving unrelated components. Its 5,004-cell artifact passed complete schematic readback. The next gate is user design feedback and an isolated player/visual check, followed by bounded execution and recovery tests.

Keep this first component pass in exported artifacts and an isolated test world. Add the agent tool interface and visual revision loop after the compiler and change records are testable. The current `BlockGenerator` seam is not itself an agent loop, and the 10,000-entry ceiling does not establish production-scale building quality or performance.

## First acceptance trial

Create one furnished building from representative references in an isolated test world. Inspect multiple views and request a selective revision. Evaluate block states, usable rooms and stairs, plot containment, unrelated-component preservation, rollback, server responsiveness, model usage, and architectural fit. Integration feasibility does not establish design quality; that remains a trial outcome.

## References

- [Architectural visualization workflow](https://developers.openai.com/blog/architectural-visualization-with-astra)
- [Astra model capabilities](https://developers.openai.com/api/docs/models/gpt-6-astra)
- [Codex MCP integration](https://learn.chatgpt.com/docs/extend/mcp)
- [Mineflayer](https://github.com/PrismarineJS/mineflayer)
- [Minecraft MCP reference](https://github.com/yuniko-software/minecraft-mcp-server)
- [Mindcraft](https://github.com/mindcraft-bots/mindcraft)
- [BlueMap screenshot workflow](https://bluemap.bluecolored.de/community/python-screenshots.html)
