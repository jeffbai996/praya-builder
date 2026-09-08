# Furnishing existing buildings — requested future capability

Source: direct user direction in task 01a08052-706a-7de3-b784-560d3a37a13f, 2026-09-08.

## Confirmed context and intent

Many existing Praya buildings have empty interiors because building labour/time is limited. Do not interpret an empty interior as a deliberate architectural preference or evidence that the building has no intended use. The user wants a future builder to furnish existing unfurnished buildings where feasible. This is a requested capability, not an implemented feature or authorization to edit arbitrary live buildings.

## Proposed workflow

1. Survey a selected existing building and identify its shell, floor levels, entrances, stairs, windows, existing fixtures and protected contents. Capture exact block data; screenshots alone cannot establish the interior.
2. Establish intended use and desired fit-out scope. Distinguish furnishing already divided rooms from proposing partitions, circulation or services for an empty shell. Keep structural alterations separate and explicit.
3. Produce reviewable interior alternatives within the actual usable space. Preserve exterior identity, windows, structure, existing useful details and routes by default. Report insufficient dimensions/headroom instead of forcing an arrangement.
4. Compose furniture from ordinary blocks and the approved custom-head library, following building-style.md. Use building/operator-specific signs and identity assets where applicable. Do not assume decorative fixtures function as inventory or machinery.
5. Preview floor by floor with existing/proposed differences, room uses, clearances and affected cells. Support selective room or component revisions without regenerating the building.
6. Save the exact approved fit-out and apply through a bounded durable job after rechecking current conditions. Preserve unrelated blocks and later edits; provide readback and conflict-aware rollback. Reuse the existing lifecycle where it fits, while treating real-building fit-out as a new acceptance trial.
7. Check the furnished result in-game, including doors, stairs, routes and actual custom-head/sign appearance. Geometry heuristics alone are insufficient.

## Dependencies and open choices

- Reliable existing-building survey and indoor space interpretation.
- Supported sign/custom-head metadata throughout preview/export/placement, without stripping or overwriting unknown block entities.
- Handling interiors larger than current single-plan budgets with bounded room/floor jobs.
- A user-selected pilot building and intended room programme when implementation begins.

Current priority remains design experimentation and studio usability. No world changes are required to record or develop this roadmap.
