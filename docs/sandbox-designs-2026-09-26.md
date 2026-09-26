# Sandbox construction and neighboring designs — 2026-09-26

## Runtime and placement

Praya (Sandbox) is running on `fragserv.tailab4af9.ts.net:25566`. The server MOTD, panel brand and Sandbox environment label now use that name. Only Sandbox services and the Builder Studio service were restarted. Main Praya stayed inactive. All 2,060 production world files match the manifest captured before this run.

Sandbox world UUID: `fda1535c-b6be-43a6-acb0-2a1e932e9646`. Active bridge bounds are minimum `[-280,48,-485]`, exclusive maximum `[-213,112,-454]`, covering the original lot and its immediate eastern neighbor. The interchange is outside these active bounds. Its underground preservation requirement remains: do not excavate below Y 60 there.

Terraced Residences R3 is placed at its original intended lot, X -272 through -246, Z -477 through -463, origin Y 79. The recorded Point Tower placement was first rolled back through its own conflict-aware job. Rollback `4e6ff323-549b-4964-9232-d726cf6933fc` completed 4,229 changes with no conflicts. Terraced placement `89141f47-a2ce-4dfd-a3c7-c49133095de1` completed 4,616 changes and verified all 4,616 observed cells with zero verification conflicts.

The Sandbox copy uses decorative stripped-spruce cupboards and polished-blackstone cooker housings in place of barrel and smoker inventories. Geometry is retained; inventory functionality is not implemented. The original R3 draft and source survey are unchanged. Existing R3 diagnostics remain: 48 approximate headroom warnings, four pane/bar connection warnings and one lighting information item. No player walkthrough is claimed.

Jar SHA-256: `56da1ae0a1804f9422511b6697a08446342214f0bc83307ca054823349a44481`. Only the Sandbox plugin was replaced. The previous jar, configurations and production manifest are under `~/minecraft/praya-test/.builder-test/terraced-0925/`; the bridge environment backup contains private credentials and must not be published.

## Saved proposals

The exact plans, draft/revision identifiers, artifact and survey hashes are in [records.json](../preview/designs/sandbox-lots-2026-09-25/records.json).

- [Terraced Sandbox copy](https://fragbox.tailab4af9.ts.net:8463/studio?draft=b6406130-ba8e-49af-8703-7b1a8849d07b): saved and placed.
- [Point Tower, Parcel C courtyard](https://fragbox.tailab4af9.ts.net:8463/studio?site=5764a59a-8e68-482a-98de-1758524de196&draft=a354d91d-caa6-40af-b31e-c2ef02323c88): saved proposal, not placed. East entrance court, west planted courtyard, seating, lights and a north street arcade. All 3,453 non-air upper-storey cells retain their block states, ownership and world coordinates. The plan footprint expands around the existing tower; the shift in plan coordinates does not move it. No basement or parking ramp is proposed. Zero error/warning diagnostics; one lighting information item remains.
- [Alder House](https://fragbox.tailab4af9.ts.net:8463/studio?site=34dc1bab-e949-45b8-94df-28b81d1cf38d&draft=a98cc0ea-361d-4278-a192-6be60249a307): saved proposal, not placed. The immediately eastern empty parcel is X [-240,-220), Z [-477,-462). Its live capture completed two matching reads of 41,216 cells. The protected roadside fixtures remain outside the proposed changes. Seven storeys: shared lobby, six furnished compact apartments, continuous stairs and a planted roof terrace. Pale vertical fins, brown terracotta blades, front balconies and alternating east loggias distinguish it from Terraced Residences. Zero error/warning diagnostics; one lighting information item remains.

Both proposals include explicit survey clearance within their construction/landscaping footprints. Unspecified cells remain untouched. Access validation approximates full-block support and assumes openable doors; it does not replace a player walkthrough. The saved map at port 8448 shows the last rendered production map, not these Sandbox changes.

## Harness and interface

- Added fourteen static fixture/natural materials to the bounded bridge policy, including potted ferns and birch logs. Rollback requires support for original surveyed materials too. Inventory, fluid, occupied-bed and custom block-entity restrictions remain.
- The bridge advertises supported placement materials. Preparation lists all unsupported proposed/restoration materials before world reads or writes; legacy bridges still receive full per-batch validation.
- Studio elevation presets fit the complete selected building, including tall towers. Street view retains its eye-level framing; edits still retain the comparison camera.
- The agent CLI allows the review-sheet request to cover the bounded four-job render queue rather than timing out before the renderer's own limit. Other request timeouts are unchanged.
- Visible build: `b20260926.01`.

## Verification and reproduction

The authoritative checkout is on fragbox, `~/repos/praya-builder`, branch `refactor/builder-foundation`. Existing transport/revision work remains separate and uncommitted.

Verified: Java build and placement-policy probe; construction, sign, capture, design-service and roadwork checks; agent CLI checks; browser/export checks; camera/navigation controls; both proposals on desktop and 390-pixel mobile layouts. A browser geometry check projects all eight building-bound corners into each elevation view and confirms they remain in frame. Both Walk controls reset to the surveyed street height. Four stored plans recompile to their exact artifact hashes, including the unchanged source Point Tower. Saved revisions remain available after Studio restart.

```sh
export JAVA_HOME="$PWD/preview/.workspace/java21"
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
node preview/designs/sandbox-lots-2026-09-25/verify.cjs
PLAYWRIGHT_MODULE=/home/jbai/repos/cc-context/modules/browse/node_modules/playwright \
CHROMIUM_PATH=/home/jbai/.cache/ms-playwright/chromium-1226/chrome-linux64/chrome \
node preview/designs/sandbox-lots-2026-09-25/check-browser.cjs
```

These are operational checks against the recorded local workspace, not portable fixture tests. The two Python generators in the same directory use the pinned survey/source IDs through the common API. Without `--post`, they only regenerate their plan files. With `--post`, they update the recorded working drafts; immutable saved versions are retained. `BUILDER_WORKSPACE_URL` selects the service. The JSON plan files can be compiled independently of that service.

Next review gate: inspect Terraced in Sandbox and the two saved proposals in Studio. Place Alder only after design acceptance. Parcel C placement first requires deliberately switching the bridge back to its separately bounded interchange area and refreshing affected survey cells.
