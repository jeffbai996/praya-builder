# Sign bridge implementation and verification

2026-09-08. Source implementation is complete and was exercised against a disposable local Paper 1.21.11 instance. The production Praya plugin/server was not replaced or restarted.

## Contract

- `/status` advertises `capabilities.signData: 1`.
- `/read` and `/survey` return an aligned `signs` array alongside existing block states. A sign snapshot contains front/back component strings, dye colour, glowing flags and wax state. Existing `blockEntities` survey protection remains in place.
- Bounded placement changes carry `sign` and `beforeSign`. Only wall-sign block data is accepted; arbitrary block-entity NBT remains excluded. Existing nonsign tile entities remain protected.
- Both block state and complete sign snapshot participate in compare-before-write, verification, interrupted-job reconciliation and undo. A later sign-text edit is a conflict even if the block and facing did not change.
- The Studio adapter attaches authored text to rotated/transformed sign cells, including text-only changes. Protected areas apply to text-only changes too. The generated front face uses the plan's four lines; back is blank, black, nonglowing and waxed by default.
- Rich text is retained for existing-sign snapshots and restoration. Catalogue content is data, not an instruction to execute click actions.
- Schematic export and preview retain their existing authored wall-sign support.

## Evidence

- Java compilation and plugin JAR build passed (existing Paper API deprecation warning).
- Six sign-construction tests passed: new sign/readback/undo, complete metadata restoration, later-edit protection, stale-text rejection, lost-text detection, transformed preparation and protected text-only changes.
- Four pre-existing construction tests passed and seven design-service tests passed.
- Real disposable Paper test passed: two-sided Unicode, colour, glow, wax, new placement, text-only edit, exact undo, conflict preservation and stale before-text comparison. Test sign and support block were restored to air.
- This proves the bridge sign path on the disposable server. It is not a claim that the whole Corner Stores palette has passed production placement validation; its appliances and other blocks still have their own placement-policy requirements.

## Deployment status

The updated JAR is provided as `praya-builder-sign-bridge.jar`. Live Praya deployment remains a separate step requiring an appropriate plugin/server reload window. The Studio source now supports sign-capable bridges; its existing connection configuration is preserved.

Hanging signs and standing signs are not part of this placement increment. Existing surveyed block-entity protections are not automatically relaxed. A deliberate site/placement review is still needed for changes to protected existing signs.
