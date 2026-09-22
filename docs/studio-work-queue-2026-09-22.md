# Studio work queue — 2026-09-22

Implementation complete for items 1–6 below; final verification results follow. Preserve existing design/placement data; no production-world writes.

1. Free-camera control pad: clickable WASD and Q/E keys, Shift hint, Esc to orbit. Implemented.
2. Minecraft sign rendering: native bitmap lettering, black non-glowing authored text, Minecraft scale. Implemented against the existing black, non-glowing sign export contract.
3. Simplify Adjust: explain edit scope, separate materials/signs/parts, reduce raw role/coordinate noise, clarify placement summary.
4. Replace Studio design dropdown with searchable, categorized chooser that groups editions and sites and scales to a larger collection.
5. Review sheets: Urbanist typography and genuinely dark rendered backgrounds in dark/OLED themes; preserve geometry colors and immutable evidence identities.
6. Walk mode: player-sized solid-geometry collision, gravity, stairs/slabs and floor support. Doors passable; no door interaction simulation. Keep Free camera and provide reset to entrance. User approved this scope on September 22.

After interface work: targeted component revision workflow (select, request, compare, accept), then a four-parcel isolated Test Praya trial. gp-ai/citizens remain deferred.

Current accepted boundary: a Minecraft player walkthrough remains the final game-behavior check, but does not block Studio development. Original production world must remain untouched.

## Implementation and verification

- Free-camera controls use clickable WASD/QE keycaps with physical-key highlighting, Shift hint and an Orbit exit.
- Authored signs use the bundled Minecraft ASCII bitmap atlas, variable glyph advances, four 10-pixel rows, a 90-pixel line bound, and black text at 1/96 block per font pixel. Non-ASCII characters currently use a replacement glyph. Colored/glowing authored sign metadata is not part of the existing placement contract.
- Editing is split into Materials, Signs and Add parts with shared area selection and Undo/Redo. Material edits state their scope. Sign labels omit raw coordinates and decorative divider lines. Placement remains a compact sidebar action.
- The chooser searches names/sites, filters by building type, groups cross-site editions by design identity, and pages results eight at a time. Existing deep links still work.
- Review sheets use loaded Urbanist typography and separately rendered light/dark PNGs, including sign lettering. Both variants are checked under the immutable review manifest. The renderer version advances; previous evidence remains unchanged. Point Tower's 18-view paired set generated in 94 seconds and is cached. Worker timeout is bounded at 180 seconds for both themes; material instances are reused across views.
- Walk uses supplied Minecraft block collision boxes, a 0.6 × 1.8 block body, gravity, 0.6 block stepping, jumping and entrance reset. Doors are passable. This is architectural traversal, not a Minecraft game simulation. Free camera remains available. No world writes were performed.

Physics checks passed for walls, gravity, half steps, low headroom, falls, jumping, slab geometry and passable doors. Browser checks passed for movement/reset, free-flight controls, editing-task switching, chooser search/categories/editions, responsive widths, and review-sheet lazy loading/stale responses/retry/keyboard behavior. Visual review confirmed the dark Point Tower sheet and keyboard control layout.

Fragbox WSL restarted repeatedly during early browser checks; those interrupted runs are not counted as passes. The successful full-sheet run completed after the worker time budget was corrected.

Final verification: 209 Python regressions passed, 6 skipped. Updated Studio polish/control checks, chooser checks, review renderer (including dark pixels and loaded Urbanist), review UI, immutable-cache checks, and walk-physics checks passed.
