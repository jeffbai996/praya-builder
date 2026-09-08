# Building style rules

Standing user direction, recorded 2026-09-05. Apply to new proposals and revisions;
do not rewrite previously issued artifacts just to update the style defaults.

- Prefer glass panes over full glass blocks for architectural glazing.
- Prefer coloured/stained panes over clear panes. “Tinted panes” means stained
  glass panes, not the opaque-to-light tinted-glass block. Choose the tint for
  the building and room, with connected pane states matching the wall direction.
- Clear panes are an intentional exception: for example, visible check-in,
  public entrances or an interior sightline. Record the reason in the proposal.
- Signage is part of the architecture, not optional decoration. Provide legible
  building identity, a clearly marked entrance and appropriate wayfinding.
- Check branded marks against the supplied reference at block level, including
  arm alignment, spacing and the direction seen from the public approach.
- Rendered signage must belong to the compiled build. Do not use browser-only
  text overlays that disappear from schematic exports.

## BraemarHealth reference

The supplied medical-centre image shows two opposing coloured L shapes. The cyan
upper/left half and green lower/right half share a horizontal band without a
one-block tail under the cyan stem. The clinic R1 uses an explicit pixel pattern
viewed from its north-facing public frontage; no logo geometry is inferred from
the text description alone.

Latest clinic direction: the medical logo speaks for itself. New clinic revisions
must omit BH monograms and CLINIC word lettering; do not reintroduce them under
the general signage guideline. R2 keeps the exact coloured mark, with the entrance
expressed architecturally. Interior floor numerals can remain for wayfinding.

## Residential reference fit

The first Rosedale Court proposal was rejected as outside the Praya theme. Do not
treat its pink/sandstone palette, oversized arch or stacked ornamental crown as a
style precedent. R1 returns to the supplied urban references: charcoal masonry,
deep pale framing, recessed stained panes, selective brick, planted balconies
and an asymmetric silhouette. A postmodern brief still needs to fit that context.

## Interior detail

User direction: use small block combinations to make interiors feel furnished,
including signs beside slabs as armrests. Apply this at room scale, not by adding
clutter indiscriminately.

- Use slabs/stairs for seats and low tables, with thin end pieces for armrests.
  Wall signs currently produce no geometry in the pinned preview renderer, so
  Frame House uses open oak trapdoors instead. Add sign-model and block-entity
  support before relying on visible sign arms or written sign text.
- Layer beds with a headboard, contrasting carpet blankets/pillows and bedside
  lighting. Put carpet and lamps on supported surfaces; avoid floating props.
- Furnish kitchens with working-height counters, a distinct island, stools,
  cabinet fronts, basins/taps and cooking fittings. Use varied heights and depth.
- Provide bathroom partitions, basin/tap details and pane shower screens. Keep
  circulation separate from private fixtures and check door clearances.
- Orient seats toward their table, television or view. Add books, desk monitors,
  lamps and potted greenery where they clarify how a room is used.
- Every visible detail belongs to the compiled artifact. Decorative beds,
  cupboards and appliances are layout representations, not functional inventory.
- Inspect furnished floor cutaways and walking routes as well as the exterior;
  a valid bounding box alone does not make a usable interior.

## All elevations and room completeness

User direction, 2026-09-05: side and rear elevations and interiors deserve the
same design effort as the frontage. Review all four elevations and every occupied
floor, not just a flattering perspective.

- Carry framing depth, material transitions, opening proportions, shade and
  planting around corners. Rear access and service areas need deliberate design.
- Match glazing to the room: screened domestic windows and bathroom privacy;
  avoid turning every side into either a blank wall or undifferentiated glass.
- Resolve sleeping, bathing, cooking, storage and sitting/work areas at room scale.
  Keep entrance, stair, bathroom and terrace routes clear before adding furniture.
- Make rear terraces and loggias accessible from an appropriate circulation space.
  A balcony reached only through a bathroom is not a successful layout.
- Create immutable successor revisions and retain prior artifacts for comparison.
  New component ownership must explicitly name any existing component it replaces;
  the compiler continues rejecting unclaimed overlap and blocked clearances.
- Geometric route checks are useful but do not certify game physics, accessibility,
  actual player movement or code compliance.

The first application is Rosedale R2 and Frame House R1. The remaining catalogue
still needs the same staged all-elevations/interior review.
