# Studio parcel selection and control typography

## Behavior

Choosing a surveyed parcel establishes an explicit destination. Opening a working draft from another site now offers a separate placement copy, with parcel name, rotation, whole-block position and compiled write-bound checks. Opening the original site requires an explicit action. Cancel preserves the destination. URLs containing both `site` and `draft` follow the same rule, and matching site-bound drafts retain both values on reload.

Initial placement centers the compiled write area, including explicit air, rather than the declared plan envelope. The first quarter-turn that fits is selected. Copy creation retains the original draft, checks its version and artifact before submission, and uses the existing compile and validation path. It does not save a revision or prepare/apply a construction job.

Construction site choices allow survey context to extend outside the bridge's permitted area. Every actual proposed write must still fit both the selected plot and the bridge bounds. The old tower plot is outside the currently enabled interchange area and is identified accordingly. World name and UUID checks remain in place.

Responsive form text is reduced from 16px to 13px; control hit areas remain at least 40px. Native file-selection buttons inherit the form typography and theme. Release label: `b20260924.01`.

## Verification

- `node preview/check-placement-readiness.cjs`: passed. Covers world identity, immutable revision matching, all quarter turns, explicit air, survey/bridge overlap, writes below the allowed height, and the tower's unspecified plan margins.
- JavaScript syntax checks and `git diff --check`: passed.
- In-app browser: restored the supplied mixed site/draft URL; confirmed Cancel preserves Parcel C; selected Point Tower through the design library; observed 0 degrees blocked and 90 degrees allowed; created the separate draft through the dialog; reloaded it with Parcel C retained.
- Explicit Open original site returned to the original draft and removed the conflicting site query. Build listed all four interchange parcels and identified the original tower as outside the active placement area.
- Narrow layout: measured 13px for comparison, reference file/note and revision fields; visually inspected References and Request a revision. No browser console errors were observed.
- API readback: original draft matched its pre-copy record exactly. The copy has identical compiled local blocks and plan fields apart from its name.

## Parcel C copy and remaining design work

Source: `21c0f75b-705c-4134-87f1-37fb815e6f8b`.

New draft: `2b811046-2da7-42ff-91c4-879ce5d0b7aa`.

Site: `5764a59a-8e68-482a-98de-1758524de196`.

Transform: origin `[-299, 63, 410]`, one quarter-turn. The 27 by 15 plan has a 25 by 15 compiled write area; after rotation its writes fit the 24 by 25 parcel.

The copy remains invalid: the street frontage is not a supported walking position, so access diagnostics also flag the downstream doors. It needs an entrance/approach adaptation to this surveyed terrain before it can be saved for construction. No validation was bypassed and no Minecraft world writes were made.

Live draft: https://fragbox.tailab4af9.ts.net:8463/studio?site=5764a59a-8e68-482a-98de-1758524de196&draft=2b811046-2da7-42ff-91c4-879ce5d0b7aa
