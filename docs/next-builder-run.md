# Next builder run: one real Praya plot

Start from b20260906.07. Preserve the dirty foundation checkout, catalogue,
existing studio drafts and file repository. No authentication or model-provider
integration is needed for the studio. Do not add unused adapter stubs.

The UI now shares icon theme controls and compact layer switches across review
and studio. Studio keeps its draft selector beside the project heading and has
Site / Design / Revise / Place shortcuts. `/?panel=register` opens the register
directly. Studio controls stay inert until initial connection completes.

## Current working path

BlueMap's **Select a plot** carries two selected corners into studio. Saved
selections contain bounded capture volumes, frontage and protected areas. The
updated isolated adapter captures and verifies the volume in durable batches;
WorldEdit upload remains a fallback. Completed captures create immutable surveys.
Drafts compile through the existing design service and saved
revisions export an exact placement package. Actual construction remains bound
to the isolated test-world adapter. Praya now runs the updated adapter in read-only
mode. The first user-selected 27 by 15 plot has a verified immutable survey, an
eight-block context band, preserved block-entity exclusions and a reloadable site
link. Its grass surface spans Y 78–80. Read current records from the API rather
than embedding private coordinates or service tokens into source.

Run the read-only readiness report before deciding where to work:

```sh
node preview/next-run-readiness.cjs
node preview/next-run-readiness.cjs <selection-id> [prepared-job-id]
```

Use `BUILDER_WORKSPACE_URL` for another studio host. The report checks world
identity, all three plot dimensions and an optional prepared job. It does not
grant permission, capture blocks, write the world or change adapter configuration.

## Implementation order

1. **Bounded automatic capture — delivered.** `/survey` advertises capability
   version 1, reads 128 cells per batch on the server thread and never generates
   missing chunks implicitly. The studio uses durable progress and cancellation.
2. **Survey publication — delivered.** Two complete matching sequential reads
   publish a survey bound to world UUID, dimensions, selection, source version,
   timestamps and hashes. Partial captures cannot become baselines. Block entities
   are protected automatically. This is not an atomic snapshot; placement rechecks.
3. **Praya design trial — next.** The first real capture is complete. Produce
   three bespoke alternatives that fit its narrow buildable area, rather than
   shrinking the fixed 32-by-32 apartment template. Review retained trees, street
   connections, all elevations and interiors. Use the existing construction lifecycle for exact
   revision, survey and transform binding. Do not route generic commands through
   the studio or substitute a bare paste for the durable job contract.
4. **Placement in context.** Make capture, review, placement progress, readback and
   undo available as ordinary controls. Recheck the target before each write batch.
   Preserve unspecified cells, explicit-air semantics and unrelated later edits.
5. **Map feedback.** Publish accepted footprints and observed placement status as
   a dedicated BlueMap marker set. Key markers to independently versioned building
   records; preserve the existing street and transit markers. Proposed and observed
   geometry must remain distinguishable.

## Acceptance gates

- Cancel/restart a capture without publishing a partial survey; exercise missing
  chunks, out-of-bounds requests, wrong world identity and changing terrain.
- Repeat a capture deterministically on a stable isolated fixture; compile all
  three alternatives and preserve unrelated geometry during one scoped revision.
- Inspect all elevations, roof and floors, then execute bounded placement with
  cancellation, readback and conflict-aware undo in the isolated world.
- Repeat on the chosen Praya extract and complete an actual player walkthrough.
  Browser rendering and grid reachability do not substitute for this step.
- Existing catalogue/export/browser checks pass. No new paid services or database.

## Follow-on scope

After the real-plot workflow, simplify gp-ai around places and simulated citizens:
building uses, entrances, routes, daily routines and contextual interactions.
Inventory the existing plugin first and remove unwanted municipal workflows
deliberately. Do not change gp-ai during the capture/placement slice. Citizens
should consume accepted place/building records and observed world state rather
than draft geometry. District generation remains a later, parcel-by-parcel phase.
