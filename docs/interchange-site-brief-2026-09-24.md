# Interchange trial: live site brief — 2026-09-24

Status: four live Sandbox surveys completed. No construction placement was submitted. User authorized these empty plots near X -224, Z 324 and instructed autonomous progress with a pause before large, long-horizon actions.

## Verified sites

All captures used the isolated `praya-test` UUID `fda1535c-b6be-43a6-acb0-2a1e932e9646`. Each capture completed two matching sequential reads; these are not atomic world snapshots. Placement must recheck affected cells.

| Parcel | Footprint | Ground surface Y | Tree blocks in footprint | Protected block-entity cells in survey | Studio |
| --- | --- | --- | --- | --- | --- |
| A | 24 × 24 | 65–77 | 60 | 1 | [Open A](https://fragbox.tailab4af9.ts.net:8463/studio?site=aa439fbc-a39c-4e61-9370-6e9e43c8f96b) |
| B | 21 × 24 | 63–75 | 120 | 3 | [Open B](https://fragbox.tailab4af9.ts.net:8463/studio?site=f90f1ac9-13a1-40ed-b767-d986ea659b75) |
| C | 24 × 25 | 63–67 | 60 | 1 | [Open C](https://fragbox.tailab4af9.ts.net:8463/studio?site=5764a59a-8e68-482a-98de-1758524de196) |
| D | 21 × 25 | 63–70 | 255 | 2 | [Open D](https://fragbox.tailab4af9.ts.net:8463/studio?site=1d2a10ff-c3a7-4d04-ab60-f0721e686fe1) |

Ground heights exclude trees and grass plants. Tree counts include logs and leaves, not a proposed removal quantity. All four recorded frontage points have a grass block below and two clear air cells above. This verifies standing clearance at the parcel edge, not an engineered connection to the street.

Parcel C is the proposed first trial: the largest footprint with the smallest ground-height range. Use a compact building with terrain-aware foundations or stepped outdoor access. Parcel A/B rise 12 blocks across their footprints; avoid treating them as flat pads.

## Underground preservation

The live C and D surveys found placed wall torches at Y 49–50. This establishes existing underground work, not its purpose or complete extent. It must remain intact.

After the surveys, the server bridge minimum was raised from Y 48 to Y 60. Active bounds are minimum `[-307,60,376]`, exclusive maximum `[-247,112,440]`. A read-only probe at Y 59 was rejected as outside the reserved plot. Do not lower this guard for foundations or basements without reviewing the underground work.

The original survey snapshots retain Y 48–111 for context. Their hashes and blocks were not rewritten. Their per-cell protected lists cover detected block entities; the additional depth restriction is enforced separately by the server bridge. New live recaptures must use Y 60 or higher while that guard is active.

Intervening roads and the interchange remain outside each buildable plot. Protect existing road/utility connections during design. The bridge now targets the interchange area only; old tower-area placements are unavailable until its separate saved bounds are deliberately restored. No rectangle spanning both areas was authorized.

## Next design gate

Await the user's first real-building reference before starting a larger generation run. Begin with one adapted proposal on Parcel C, preserving recognizable form and useful Minecraft room/circulation dimensions. Inferred sides, rear and interiors must be labelled as design decisions. Do not generate or place the entire four-parcel block as part of this survey task.

Targeted revision comparison/acceptance remains separate unfinished implementation work. This site preparation does not claim that workflow or the reference-to-proposal pipeline is complete. Roadwork is separate; the approved building parcels do not authorize redesigning the surrounding roads. gp-ai/citizens remain deferred.

## Evidence

- Fragbox workspace: `interchange-trial-20260924.json` pins selection/capture/site IDs, hashes, completion states and the prior draft identities. `interchange-site-assessment-20260924.json` records materials and frontage checks.
- FragServ: `/home/jbai/minecraft/praya-test/.builder-test/interchange-trial/live-captures.json` and `verification-20260924.json`.
- Existing draft versions and artifact hashes remained unchanged. All 2,060 production world files matched the earlier baseline; main Praya stayed inactive.
- The Parcel C surface-mesh endpoint returned successfully. Browser automation was unavailable in this session, so no visual UI pass is claimed. The app was asked to open Parcel C.

Parcel A: site `aa439fbc-a39c-4e61-9370-6e9e43c8f96b`, survey hash `fbe765fe41e456ca7fa6bef2f993b15a35c5da714b94ae39491ee6dcf6909cbb`.

Parcel B: site `f90f1ac9-13a1-40ed-b767-d986ea659b75`, survey hash `aa08177a1bd34cb29d8366a9e2ead50b2654bc81a58c10e3680400e275bfb073`.

Parcel C: site `5764a59a-8e68-482a-98de-1758524de196`, survey hash `28a0fcc05c7f1b78ead3f707d60769d6eb86b0cdbc2369541b5dceb849fd3ac0`.

Parcel D: site `1d2a10ff-c3a7-4d04-ab60-f0721e686fe1`, survey hash `e3890faae2323fb52fe23790a92741f23af781eeccfd90321809ffc394267e66`.
