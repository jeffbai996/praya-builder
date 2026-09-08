# Building proposals and revisions

Apply the standing [building style rules](building-style.md) to new proposals:
panes before glass blocks, tinted panes by default, deliberate clear-glazing
exceptions, reference-accurate branding and built signage.

## Braemar Frame House — R0

`?project=mansion` opens a new garden-residence proposal based on the supplied
Braemar mansion image. It adopts the broad pale outer frame, recessed smoked
glazing, dark wall panels, timber accents, planted roof terraces and low street
boundary. The 44 × 40 site is a study plot, not a surveyed or confirmed canon
address. The gate's block-built numeral is a sample house number.

Two occupied storeys flank a double-height dining hall, with an upper rear
gallery and a smaller dark roof pavilion. The footprint steps at the entrance
and between the wings. There are three bedrooms, an open living/dining/kitchen
floor, study, enclosed guest bathroom, primary-suite bathroom, utility nook,
pool and furnished roof terrace. Clear panes preserve garden views through the
dining hall and visibility within showers; gray stained panes are the default.

Reusable `furniture-kit.cjs` combinations add stair sofas with open-trapdoor
armrests, slab coffee tables, layered carpet bedding, bedside lamps, desks and
monitors, thin cupboard fronts, cauldron basins, hook taps and hanging lanterns.
Furniture remains actual compiled cells. Wall signs were tested but render
invisibly in the pinned asset pipeline, so they are not used for armrests yet.

Use **Living floor cutaway**, **Bedroom floor cutaway** and **Roof lounge
cutaway**, then the Roof preset and zoom to inspect rooms. Camera presets centre
on a project's site dimensions; revision switches retain the camera for comparison.
The entry, main rooms, all bedrooms and roof lounge pass conservative voxel
reachability checks, not a Minecraft movement/physics certification. Schematic
round-trip and in-game furnishing inspection remain pending for this proposal.

## BraemarHealth Hillside Clinic — logo-led postmodern R2

`?project=braemar` now opens R2. All BH and CLINIC word geometry is removed,
including the former identity monument and fascia. The corrected cyan-and-lime
medical mark is unchanged. The former sign monument becomes a low planted seat.

A stepped quartz-and-terracotta entrance arch, small tower oculus, warmer brick
walls, repeated pale lower columns and layered cornice introduce postmodern
geometry. Low screened rooftop plant replaces the tall mast. The 36 × 36 site,
three furnished clinical floors, stained-pane preference and room/stair routes
are preserved. R0 and R1 remain unchanged as historical comparisons.

## BraemarHealth Hillside Clinic — enlarged R1 (superseded)

`?project=braemar&revision=r1` opens R1 for comparison. The main
occupied footprint grows from 25 × 19 to 29 × 21 blocks (about 28% larger), on a
36 × 36 site. Three clinical floors and the existing care programme are retained,
with wider care rooms and a deeper rear bay rather than an extra storey.

Exterior and clinical glazing uses connected gray stained-glass panes, oriented
along each wall. Clear panes remain at ground-floor check-in for visibility from
the entrance and at the entrance tower to retain the intended transparent shaft.
No full glass blocks remain in this revision.

The medical mark is rebuilt from an explicit two-L pixel pattern: cyan upper-left
and green lower-right when seen from the public frontage, with the extra cyan
tail removed. A flush CLINIC fascia, entrance direction marker, BH identity
monument and interior floor numerals are compiled block lettering, not viewer-only
labels. Signage occupies a dedicated dark band; planting moves to smaller returns
to preserve legibility. Small Minecraft signs with full name text are not
implemented here.

## BraemarHealth Hillside Clinic — reference-led R0

`?project=braemar&revision=r0` opens the first three-storey proposal, leaving both Garden
Medical Clinic revisions unchanged. The supplied BraemarHealth Braemar Hills
Medical Center screenshot is the visual source: a tall dark entrance tower with
a narrow illuminated frame, projecting pale slab edges, a glazed upper wing,
cyan-and-lime cross, repeated street-level fins and rooftop mast. This study
adopts those elements; its name and synthetic site do not establish a new canon
location or claim an exact reconstruction of the existing medical centre.

The ground floor has reception, waiting and two exam rooms; the middle floor has
two more exam rooms and a waiting lounge; the upper floor contains procedure and
recovery rooms. Three-block-wide stairs, landing corridors, stacked washrooms,
staff pantry counters, storage, clinician desks, exam couches and basins provide
interior detail. Roof plant is screened in charcoal, with a planted tower cap
and street-edge planting. Floor cutaways expose all three levels.

This is a 32 × 32 × 32 artifact. Circulation tests use the existing conservative
voxel model, not player physics. Doors, a working lift, accessible routes,
clinical operation and regulatory compliance are not implemented or certified.

## Current revisions

The clinic, market and school default to R1. Their original R0 artifacts remain
available for fixed-camera comparison; the first-proposal notes below describe
that baseline.

- **Clinic R1:** an L-shaped occupied footprint and roof. The removed frontage
  becomes a planted arrival court, with a glazed return wall and separate garden
  door. Consultation rooms remain furnished; reception and its marker are
  relocated within the retained wing.
- **Market R1:** a voxel-stepped diagonal entrance and matching canopy, plus a
  narrower offset rear stockroom wing. Refrigeration plant moves onto the service
  wing; the removed rear corner becomes a planted delivery court.
- **School R1:** two classroom wings wrap an open-sky learning court. The entrance
  moves into the glazed rear connector; classroom access is redirected through
  the rear rooms rather than leaving upper-floor doors opening into the court.
  Four classrooms and the original stair remain.

These are occupied-envelope changes, not painted roof outlines. Tests check roof
coverage, open-sky points, room reachability and unchanged R0 hashes.

## Rosedale Court — Praya residential redesign R1

`?project=postmodern` opens a new authored design, not a recolour of the rejected
R0. Six storeys retain ten studios and a penthouse, but use an asymmetric stepped
envelope, deep quartz frames, charcoal deepslate walls and selective brick piers.
Smoked panes recess behind projecting balconies with timber planters. A sheltered
street canopy and compact address numeral identify the entrance; a flat planted
roof and timber pergola replace the old sculpted crown.

The furniture layouts use layered beds, bedside lanterns, thin sofa arms,
kitchenettes, basins, cupboards and potted plants. All six floors and the studio
entrances are reachable in the conservative voxel check. Full bathroom fit-out,
functional furniture, roof access and in-game movement remain unfinished. The
small rooflight uses stained glass blocks as a horizontal closure; wall glazing
uses stained panes. The 32 × 32 × 32 bounds and six floor cutaways are retained.

## Rosedale Court — original R0 (rejected style direction)

`?project=postmodern&revision=r0` opens the earlier six-storey proposal: ten compact studios across the
first five levels and one top-floor penthouse. Warm brick, cream cornices, rose
pilasters, an oversized entrance arch and a broken-pediment crown establish its
postmodern character. Chamfered lower corners and two upper setbacks articulate
the mass, with planted terraces on the fifth and sixth levels. Furniture marks
sleeping, living and kitchenette areas; full bathroom fit-out is not yet modeled.

The site remains 32 × 32, but its artifact is 32 blocks high. Six cutaway levels
and the roof-removed view inspect the interiors and continuous staircase. As with
the other proposals, accessibility, escape routes, privacy doors, final interior
fit-out and real-world code compliance have not been established.

## Neighbourhood services — original R0 proposals

Three authored R0 designs extend the existing residential and library catalogue.
Each occupies a synthetic 32 × 32 site; names identify new proposals, not existing
canon buildings or assigned Praya plots. Geometry is compiled into the same block
artifact used by the browser and schematic checks.

## Reference language

The supplied Braemar references inform these designs: pale structural frames,
charcoal vertical articulation, recessed glazing, warm timber, planted street
edges, small-scale furniture and lit pedestrian approaches. The medical centre
reference informs the clinic's cyan marker and institutional fins; the Netflix
office reference informs brick-and-frame proportions. These are interpretations
of the supplied screenshots, not surveyed reproductions.

## Garden Medical Clinic

One storey with a glazed reception and waiting room across the frontage. A central
patient corridor serves two examination rooms on one side, a treatment suite and
staff/washroom spaces on the other. Furniture includes exam couches, worktops,
screens, storage, sinks and waiting benches. The roof has corridor rooflights,
planting and screened ventilation equipment. A shallow timber-lined entrance
canopy, cyan medical cross, garden seats and planted borders establish its
street identity.

Review `?project=clinic&revision=r0`. Use **Care rooms cutaway** to inspect room
division or **Ground floor plan** for furniture and circulation.

## Go Corner Market

An original Amazon Go-inspired convenience-store proposal, not an Amazon site or
implementation of its checkout technology. Open scanner-like entry pedestals
lead into three stocked gondolas. A glazed chilled-food wall, drinks cabinets,
coffee preparation counter and snack seating differentiate the selling floor.
A rear partition separates stock pallets and a side-connected delivery opening.
Brick piers, a green fascia with block-built GO lettering, a deep timber-lined
canopy, pocket seating and screened refrigeration plant complete the envelope.

Review `?project=market&revision=r0`. **Retail hall cutaway** exposes aisles,
fixtures and the separate rear service passage.

## Parkside Elementary

Two storeys with four classrooms, each containing six pupil desks, seats, a
teaching wall and bookshelves. A central corridor and three-block-wide stair
connect the levels. Ground-floor rear rooms house administration and a small
canteen; upstairs are washrooms and a shared reading/work room. The street-facing
yard has a patterned play surface, sand table, shelter and low fencing. Brick
classroom bays, pale frames, coloured entrance markers and roof planting give
the school a distinct civic character.

Review `?project=school&revision=r0`. Compare **Ground floor cutaway** and
**Upper floor cutaway**; the upper floor includes a real stair opening and landing.

## Scope of detail

Furniture and service equipment are architectural block arrangements, not
functional checkout, medical, ventilation or inventory systems. Doorways are
open for this first layout study; room privacy doors, accessible circulation,
fire escape routes and exact site fit remain design-review topics. No code
compliance or construction approval is implied. These proposals add no world
placement or zoning functionality.

The city's eventual zoning-led map-painting direction is recorded separately in
the [long-term roadmap](agent-roadmap.md#long-term-direction-zoning-led-city-building).
