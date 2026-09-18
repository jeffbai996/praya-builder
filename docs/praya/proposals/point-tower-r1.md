# Point Tower R0–R1 (Praya first plot)

Date: 2026-09-18. Author: claude (bot), at the user's request as the first Fable-authored design through the studio contract. Review only; no world placement.

## Brief

A residential highrise for the captured Praya first plot (27 × 15, street frontage north at plan x 13). The survey volume ends at Y 112, so anything above 33 blocks over the plan origin (Y 79) fails review as unknown context. R0 was first drafted as an eleven-storey tower and rejected by the compiler for exactly that; the built height is therefore six residential storeys over a lobby podium, roof slab at plan y 29, crown at y 32.

## Design

- **Street face:** pale quartz piers two blocks deep at the slab line, black stained panes recessed one block behind them, iron-bar rail on each ledge. Ground floor is a lobby with clear panes to the street, a slab canopy on two timber posts over the paved approach, and the retained forecourt trees on either side.
- **Rear:** the same pier rhythm in pale quartz with charcoal spandrels and light-grey privacy panes. Brick appears only as two full-height blades marking the core lines. R0 had a brick grid across the whole rear; that reads as a different building and repeats the rejected terraced R0 pattern, so R1 replaced it.
- **Flanks:** polished deepslate masonry with punched black-pane windows and open spruce trapdoor shades. West side carries planted balconies on storeys one to three, the middle one shifted a bay north so the silhouette is not symmetrical. The top two storeys step back four blocks on the east onto a planted terrace with its own door.
- **Roof:** continuous two-course pale parapet (R0's alternating slab crown read as crenellation and was removed), a stripped-spruce screen around the stair and lift head, sea lanterns at the four corners.
- **Core and flats:** a switchback stair (two flights of two risers with a half landing) and a two-by-two lift shaft in a charcoal core behind a glazed corridor. Two flats per typical storey, one on the set-back storeys, each with a bed alcove against the outer flank, seating, a kitchen run and planting. Level signs sit above head height in each corridor; two lobby signs name the building and the core.

## Verification

- Compiles within limits: 4,079 owned cells including 179 explicit-air clearance cells for existing tree blocks inside the built volume, 94 components, 69 palette states with pane/bar connection states resolved from in-plan neighbours.
- Draft `b084a59d-b12d-430c-bbac-e29091f266e4` on the Praya first plot, transform origin [-272, 79, -477], no rotation: no diagnostics, no assessment errors, 264 survey collisions (expected overwrites of grass, short grass and tree blocks), all 16 doors reachable in the voxel walk model from the street frontage (1,740 cells reached).
- R0 draft `ca57d1de-f6c2-4b04-82e0-5530ddcd838c` retained for comparison. Two earlier R0 attempts failed review: unknown context above Y 112, then unreachable flat doors because each level's stair infill filled the headroom holes of the flight below.
- Inspected in the studio: perspective, front, side, rear, street, roof, ground-floor and third-floor cutaways. Not inspected: actual player walkthrough, resource-pack appearance, in-game sign rendering.

## Known limits and next moves

- The 10,000-cell ceiling was not the constraint here; the 33-block survey cap was. A taller highrise needs a taller capture.
- Interiors are laid out, not furnished to the Frame House standard. Bathrooms are not yet resolved.
- The plan and the generator script live in `preview/designs/point-tower-2026-09-18/`. The generator resolves pane states itself; the compiler still does not.
