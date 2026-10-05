# Priority residential references — Hilltop and Dragonpeak

## Recorded user direction

**CONFIRMED USER PREFERENCE, 2026-10-04.** In the Blender house-tour task, the user supplied `-289 92 -195` and `-328 102 -275`, then said these should be weighted heavily going forward for houses and interiors because they are some of the best existing examples. The user also pointed out a climbing wall in one of the houses.

Use both existing builds as primary positive references when developing houses and interiors. Their priority comes from the user's direct selection, not from approval of an assistant-generated render or film. The maintained rule is in [building-style.md](../building-style.md#priority-house-and-interior-references--2026-10-04).

## Source identity and access

| Reference | User-supplied locator | Identity visible in saved signs | Evidence |
| --- | --- | --- | --- |
| Hilltop / 山頂 | `-289 92 -195` | Hilltop; 1 Redwoods Blvd; Braemar Hills | Saved-world block states, sign block entities, furnishings, custom-head textures and source floor survey |
| Dragonpeak / 龍頂 | `-328 102 -275` | Dragonpeak; Braemar Hills; Built December 2, 2021 | Saved-world block states, sign block entities, furnishings, custom-head textures and source floor survey |

Names, locality, address and construction date here are **OBSERVED SAVED-SIGN CONTENT**. No Dragonpeak street address was found in this bounded survey. The existing October 2 reference record treats `Braemar Hills / dragonpeak / 龍頂` as an area label and explicitly does not establish a house name. `Dragonpeak` is the working presentation label used for this coordinate in the tour; it is not a newly confirmed canonical building name. This record does not invent an address or reconcile every historical sign with current lore.

The earlier [October 3 interior study](reference-interiors-2026-10-03.md) samples the Hilltop footprint near `-286, -192`; the October 2 survey at `preview/designs/pacific-house-references-2026-10-02/reference-records.json` records the other house near `-327, -282`. Those surveys use Sandbox `praya-test`, while the present tour uses the saved production-world snapshot. They are related evidence, not interchangeable captures.

The read-only source is a saved production-world snapshot. The private presentation projects are identified as `praya-house-289-195` and `praya-house-328-275`; their locations remain in the originating task's artifacts. In each project, `source/world-sample.json` retains region provenance/hashes and `source/mesh.json` retains exact represented block states. Packed native Blender projects and browser derivatives are inspection aids. Machine names and personal filesystem paths are not part of this design record.

Hilltop's presentation crop is X `-322..-253`, Y `71..98`, Z `-235..-158`, including its lower structure and water. Dragonpeak's crop is X `-339..-290`, Y `78..111`, Z `-317..-234`. These are source-survey bounds, not proposed construction plots.

## Observed techniques to study

These observations describe the selected builds. They are not requirements to replicate every feature on every residential project.

- **House and site together.** Hilltop extends down the hillside and integrates water, pool and terraced outdoor space. Dragonpeak combines a framed, stepped exterior with planted edges, roof seating and terrain-side recreation. Examine lower floors, service space, outdoor circulation and roof use along with the frontage.
- **Rooms have a clear use.** Study the actual furniture groupings, partitions, door positions, stairs, storage, artwork, bedrooms and outdoor seating rather than filling rooms with arbitrary decorative objects. Preserve route and door clearances when adapting ideas.
- **Small blocks carry detail.** Beds, slabs, stairs, trapdoors, signs, lanterns, rods, item frames, paintings, banners, custom heads and ordinary utility blocks are composed into furniture and equipment. Their arrangement and orientation matter as much as their presence.
- **Distinctive amenities belong to the plan.** Hilltop's pool and Dragonpeak's roof lounge and terrain-side climbing feature are specific uses, not generic luxury labels. Study the space and access each use needs; a climbing wall is an available design idea, not a mandatory accessory.
- **Depth and privacy vary.** Pale framing, darker materials, layered screens, glazing, recesses and planting have different jobs around the building and within rooms. Retain the standing stained-pane and all-elevation rules while fitting the chosen house, room and site.

## Climbing-wall evidence

**USER-REPORTED FEATURE:** one selected house has a climbing wall.

**IDENTIFIED IN THE DRAGONPEAK SOURCE VIEWER:** 72 east-facing, wall-mounted stone buttons at X `-335`, Y `87..91`, Z `-289..-267`, attached to the stepped natural stone/terrain face at X `-336`. A rendered source view shows the holds along the rock face beside the house, matching the climbing feature reported by the user. The button rows follow the rising rock face; the adjacent passage has patterned paving, and chains occur farther along it. The exact purpose of adjacent chains is not inferred here. The [saved source-view screenshot](../reference-images/2026-10-04_dragonpeak-climbing-wall-view.png) is a Blender-export/browser derivative, not an original in-game photograph. In-game use, access, safety and playability have not been tested.

## Validation limits

The tours are render derivatives of bounded saved-world data. Static entity fixtures have some interpreted silhouettes; moving mobs are omitted. Film lighting and transparent-glass presentation adjustments are not source build changes or new style authority. Neither browser inspection nor geometry extraction proves in-game walking routes, functional climbing or accessibility. No live-world blocks were changed for this record.
