# Point Tower R4 and design library — 2026-09-21

## Delivered

R4 clears the wet-room approaches, moves kitchen fixtures onto the rear wall, adds upper-floor study/dining furniture and flank window sills, and corrects bed-half orientation. Cookers are decorative polished-blackstone fixtures; inventory-bearing smokers remain outside placement policy.

Draft: `21c0f75b-705c-4134-87f1-37fb815e6f8b`.
Saved revision: `f6fb9e3d-fddd-4354-8e93-6c81e1ff8cda`.
Artifact: `135655f581c6caf02ecc5c7122642bae0d322430e6f967ac3ae771399485ffc2`.

The library groups editions across sites under one design, supports building-type filtering and name search, and expands saved versions and working drafts. Saved-version links open immutable review sheets without creating a draft. Site labels distinguish editions attached to different surveys. Known design identities have explicit type assignments in `preview/design-library.js`; new identities fall under Other until classified. Classification does not modify artifacts or surveys.

## Test placement and recovery

Only Test Praya was targeted: world UUID `fda1535c-b6be-43a6-acb0-2a1e932e9646`, origin `[-272,79,-477]`, dimensions 27 × 33 × 15.

Final placement job: `f34b9b6c-355a-4c82-a5eb-d28906a7c441`.
4,229 changes completed with verified readback and no conflicts.
Observed hash: `5820237adc13008b77840b3b2ad3a2ab219c01778bf5e407fe69d81a2c0cd703`.

Rollback job `7278132f-0322-4c39-8ea5-3dc9adeff6cd` preserved one deliberately introduced gold-block edit. That marker was restored to its recorded terrain value before R4 was placed again. Final readback matched the first successful placement. The building remains available for a player walkthrough on port 25566, near `-259 81 -477`.

Test-only jar SHA256: `5e30c22c9fc5051798eb8616a2433311ca540c3e6c244473c07ca3ec12818a19`.
Production plugin was not deployed. The adapter permits the tested static fixtures and beds without persistent custom data; occupied beds, inventory containers, fluids and waterlogging remain rejected.

## Original-world audit

The user independently started production during the trial and stopped it when both servers started. This changed production save-file hashes, so a claim that all original-world files remained byte-identical would be incorrect. An offline comparison of all 13,365 block states in the original plot against the pre-placement terrain found zero changes. Placement calls targeted the verified test UUID only.

Evidence on fragserv: `~/minecraft/praya-test/.builder-test/r4-trial/original-plot-comparison.json`. Durable construction job records are in the Studio workspace store.

## Verification and remaining acceptance

R4 compiled with zero diagnostics. Focused tests cover same-floor bathroom/study access, paired bed states and placement block-entity guards. Browser checks cover library pagination/search/sorting, type filters, cross-site grouping, edition links, no draft creation when reviewing, responsive widths, and Studio navigation/camera retention.

The actual player walkthrough remains outstanding. Inspect entrances, stairs, all room doors, upper-floor circulation and exterior connections before broader placement trials. Production world writes and gp-ai integration remain outside this slice.

Full regression suite with Node 20.20.2 and the bundled Java 21: **209 passed, 6 skipped**. Initial runs used the wrong remote-shell toolchain and were discarded after correcting the environment. `check-library-projects.cjs`, `check-library-editions.cjs`, and `check-studio-polish.cjs` passed against the live Studio service. R4/adapter source commit: `1cbce98`.
