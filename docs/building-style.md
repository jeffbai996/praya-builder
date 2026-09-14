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

## User canon and reference session — 2026-09-08

See [the canon and reference record](praya-canon-notes-2026-09-08.md) for user-confirmed geography, screenshot evidence, corrections and unresolved details. The Museum of Immigration is on Taiping Island, a separate municipality in Braemar County; it is not in Trinity Square.

- Continue the user’s preference for lanterns, trapdoors and inventive block-shape combinations.
- Follow the established street-number/address sign format. Confirm exact text, spacing, abbreviations and bilingual wording from clear references rather than inventing them. The recorded screenshot transcription is provisional.
- Preserve the existing clinic-specific signage exception above. Written signs need actual block-entity/export support, not browser-only labels.
- Current priority is design experimentation and studio usability; the real-plot placement milestone is temporarily set aside.

Canon, terminology and provenance start at [Praya canon and design](praya/README.md). This file remains the sole owner of building style rules.

- User direction, 2026-09-08: combine ordinary-block props with custom player-head objects. Reuse the existing City Hall head collection or source suitable new heads once supported. See [asset-library requirements](praya/asset-library.md); custom-head rendering/export is a capability request, not a currently validated feature.

## Positive school reference — 2026-09-08

The user identified Braemar Hills Elementary School and said it closely resembles the builder's earlier school attempt. Retain this as positive architectural-fit feedback; the exact comparison revision was not specified. See the [reference image and observations](praya-canon-notes-2026-09-08.md). The yellow banner represents the county, and the P symbols are custom heads. Use verified identity assets rather than approximating them from colour alone.

## BCPL identity — user direction, 2026-09-08

Future Braemar County Public Library (BCPL) branches must carry the BCPL logo identified in [the Northgate branch reference](reference-images/2026-09-08_03.45.19.png). This requirement is conditional on BCPL affiliation. Non-BCPL libraries do not need this logo; do not automatically brand the existing Civic Reading Room or any generic library as BCPL.

Preserve the referenced mark's geometry and colours. Capture/verify its exact block construction before claiming faithful reproduction, and include it in compiled/exported geometry. Branch architecture may vary; the user mandated shared identity, not replication of the Northgate building.

## BCPL Oakville reference — user direction, 2026-09-11

The user identifies the foreground building in [the Oakville screenshot](reference-images/2026-09-11_03.45.03.png) as BCPL's Oakville branch and explicitly reiterates remembering its logo. Use this alongside the Northgate reference under the existing BCPL identity rule. Preserve the mark's stepped block geometry and orange, dark, pale-white and red arrangement; do not substitute generated civic banners, plain lettering or an invented emblem. See the [dated source record](praya/reference-oakville-bcpl-2026-09-11.md) for visual evidence and exact-reconstruction limits.

The broad low-rise frontage, tall glazing with warm vertical detail, strong roof edge and planted changes in ground level expand the available branch design references. They are observed techniques for this building, not requirements that every BCPL branch reproduce the same facade.

## Existing-building fit-out — future capability, 2026-09-08

Empty reference interiors often reflect limited labour/time, as explicitly explained by the user. They are not a style target. Future builder work should support furnishing selected existing buildings while respecting their shell, use and retained details. See [fit-out requirements](praya/interior-fitout.md); implementation and live acceptance remain pending.

## Architectural eras and Old Town Oakville — user direction, 2026-09-08

Builder must support older-looking buildings, brownstone-style attempts and architecture from different eras as well as modern designs. [Old Town Oakville](reference-images/2026-09-08_03.48.37.png) is the supplied dense, less polished reference. Do not treat the earlier modern catalogue as a universal Praya template.

- Choose district, building type and intended era before applying palette, window, facade and roof defaults. Modern glazing preferences remain defaults to interpret in context, not a mandate to replace period-appropriate details.
- Preserve existing architectural character during fit-out or revision; modernisation requires a brief that calls for it.
- Brownstone/older masonry proposals may explore narrow frontages, masonry depth, sills/lintels, cornices, stoops and compact rear/service spaces. These are proposed design techniques, not user-confirmed details or mandatory features of every older building.
- Keep mixed eras and varying levels of polish available. Do not infer dilapidation, deprivation or invented historical events from older construction or the user's critique of build quality.
- Functional interiors, clear routes, deliberate all-elevation design and applicable institutional/signage identity rules continue to matter across eras.

## Old Town study feedback — 2026-09-08

User rejected Corner Stores R0 as feeling half-finished and explicitly redirected the work from copying the generated image to learning from the supplied Praya screenshots. The generated image is a proposal, not a Praya style authority. Future studies should derive the whole building and its public edges from the user's references, with equal attention to every elevation. R1 explores continuous pavement lighting/wood edging, deep masonry framing, trapdoor screens, planted accessible loggias, a rear service court and a shared roof garden. These are design choices for this proposal, not newly established canon.

## Roof plant and finishing — user direction, 2026-09-08

Praya roofs commonly carry AC units or chimneys. User examples include wall-block stacks and four white blocks in a 2x2 square with four curved rail pieces on top to form a circular fan motif; original variations are welcome. Apply this as a rooftop-detail preference, keeping access and shared garden uses clear. The user also requested actual bed blocks and a further wall/interior finishing sweep, then explicitly requested signage.

Implementation update: Corner Stores R2 adds actual paired blue bed states and 12 authored wall signs. The Java plan compiler now accepts bounded `signs` records; text is hashed into artifacts and exported as Sponge v3 sign block entities. Studio has simplified bed and wall-sign models and renders the same authored text. This supersedes earlier statements that wall signs are invisible or that all written signs lack export support. Custom heads and live bridge sign-text placement remain unsupported; the bridge now rejects signed drafts rather than dropping their text. Exact address formatting remains unassigned until a site/address is known.

## Sign composition and roof linkage — user correction, 2026-09-08

Always compose signage centrally, both horizontally and vertically. Avoid casually filling the first three lines and leaving the fourth blank. Prefer two concise lines in the middle two rows with matching divider rules above and below, or an intentionally balanced four-line layout. The later user correction supersedes the earlier blank-outer-row preference. Reword rather than leave uneven filler. This applies to the actual Minecraft sign text as well as Studio rendering.

For the paired AC units in Corner Stores, the user specified one quartz slab connecting the two housings. User clarified they meant entity beds; leave the present bed implementation alone for now, as requested. Do not treat approval of the overall result as confirmation that the simplified bed preview matches the desired entity-rendered appearance.

## Bridge implementation update — 2026-09-08

The sign bridge now supports bounded wall-sign placement, readback, text-only edits, both-side metadata preservation and conflict-aware undo. It passed a real disposable Paper test. This supersedes the earlier blanket statement that bridge sign-text support is unimplemented; the live Praya deployment remains unchanged. See ../docs/sign-bridge.md and sign-formats.md for implementation evidence and catalogue-grounded formatting.

## Temperate climate and highrise variety — user direction, 2026-09-08

Praya has a Vancouver-like climate, not a tropical Singapore-like setting. Use temperate planting and climate cues. The user rejected three overly similar towers in the generated art and requested stronger architectural variety and Minecraft-style cars around the streets. These are design directions; the generated skyline and its geography remain proposals.

## Tower-study rejection — user correction, 2026-09-08

The user rejected Terraced Brick Residences R0: its repeated brick-and-pale-grid treatment is not how they use brick, and it did not resemble any of the generated towers. Do not reuse that facade as a Praya precedent. This is not a general ban on brick. Preserve the selected reference's massing, framing scale, recesses and material hierarchy when adapting it to blocks and plot constraints. R1 is a proposed response, not yet user-approved.

## Depth and tower refinement — user direction, 2026-09-08

User endorsed Terraced Residences R1 as a good direction and requested a slightly taller, more detailed successor with better interiors. Architectural depth is a standing preference: recessed glass panes, projecting slab and stair details, layered surrounds and other inventive block geometry. Preserve the large-frame and stepped-volume direction while refining it; do not treat R2 as user-approved until reviewed.

## Framed signs and explicit connections — user correction, 2026-09-08

Do not leave sign rows 1 and 4 empty by default. Frame short notices with balanced dash rules, grounded in the saved-world Microsoft and Please-wait specimens. Preserve actual address/bilingual formats rather than applying framing indiscriminately to historical signs.

Pane and iron-bar corners must be authored with the correct directional connection states, not only visually patched in Studio. Resolve neighboring arms before compiling and verify the same states in schematic exports. Terraced Residences R3 uses the thin-block connection authoring utility; earlier immutable designs are not retroactively modified.
