# builder workspace

A Buildings Department design-review workspace, with a DM Sans wordmark/body, Urbanist headings, and persistent light, neutral-charcoal dark and true-black OLED themes. Both fonts are served locally; their SIL Open Font License notices are in `fonts/`. The Live/Offline indicator checks `/api/health`; it does not indicate game-world connectivity. The sidebar shows release build `20260906.06` below Buildings Department; increment this label in `index.html` when publishing a new workspace release, separately from immutable building revision IDs and artifact hashes.

## Project files

| Project | Revisions | Programme |
| --- | --- | --- |
| Courtyard Apartments | R0, R1, R2 | Six apartments and a shared roof terrace |
| Terrace Mews | R0 | Two two-storey homes, balconies and a garden lane |
| Civic Reading Room | R0 | Library pavilion, rooflights and sheltered forecourt |
| Garden Medical Clinic | R0, R1 | L-shaped care wings and planted arrival court |
| Go Corner Market | R0, R1 | Chamfered entrance, stocked retail hall and offset service wing |
| Parkside Elementary | R0, R1 | U-shaped classroom wings and open learning court |
| Rosedale Court | R0, R1, R2 | Six-storey Praya redesign, smoked balconies and asymmetric planted terraces |
| BraemarHealth Hillside Clinic | R0, R1, R2 | Postmodern three-floor clinic with logo-only exterior identity |
| Braemar Frame House | R0, R1 | Three bedrooms, double-height dining, detailed furniture, pool and roof lounge |

Use the project selector or searchable register. Direct links use `?project=<id>&revision=<revision>`. IDs are `courtyard`, `terrace`, `library`, `clinic`, `market`, `school`, `postmodern`, `braemar`, and `mansion`. Omit the revision to open the latest: courtyard/braemar R2, postmodern R2, clinic/market/school/mansion R1, others R0. BraemarHealth R2 removes the BH/CLINIC wording and introduces a postmodern portal and cornice; Rosedale R1 is a new Praya residential design replacing the rejected R0 direction. BraemarHealth does not replace the Garden Medical Clinic. Its R1/R2 use a 36 Ã— 36 site; Frame House uses 44 Ã— 40. Site labels follow each artifact's dimensions. Previous artifacts remain unchanged. See [proposal briefs](../docs/design-proposals.md) for programmes and revision notes, and [building style rules](../docs/building-style.md) for standing glazing, signage and furnishing preferences.

Revision 02 is an authored proposal, not a replica or a surveyed plot: three residential floors, six compact units, shared stairs, furnished room layouts, balconies, roof planting, and a bounded frontage. Its modern facade uses pale frames, charcoal recesses, wider glazing, oak accents, and a shallow roof canopy. R0 and R1 remain unchanged for comparison. Furniture indicates layout; it is not functional inventory or block-entity content.

## Run

From this directory, with Java 21 selected through `JAVA_HOME`/`PATH` and Node.js 20+:

```bash
npm ci --ignore-scripts
npm run compile
npm start
```

Open http://127.0.0.1:8091 on the same PC. The server binds only to loopback; Windows-to-WSL HTTP access was verified at this address. Stop it with Ctrl-C. `PREVIEW_PORT` selects another unprivileged port. Catalogue review and `/studio` open directly without a login or operator key. Construction uses an optional reserved-plot Paper connection. No model-provider calls or CDN requests are made. See [the studio workflow and API](../docs/site-design-workflow.md).

### Private tailnet access

Keep the app bound to loopback. Set `PREVIEW_PUBLIC_ORIGIN` to the exact HTTPS origin reported by Tailscale Serve when starting the app, for example `https://preview.example.com:8463` (replace this placeholder with your device's real tailnet origin). The setting admits that single Host authority; it does not provide authentication or expose a listener itself. Do not use wildcards or a public proxy.

On the host running Tailscale, inspect `tailscale serve status --json`, choose an unused HTTPS port with no Funnel exposure, then add only the preview route:

```bash
tailscale serve --bg --https=8463 http://127.0.0.1:8091
```

In WSL deployments, run that command on the Windows host. Verify the resulting Serve configuration and that Funnel is absent/disabled for this listener. Existing services must remain unchanged. Use the returned HTTPS root URL from devices permitted by tailnet policy. The preview has no per-user login, so tailnet access controls define its audience. Do not use `tailscale funnel` or reset the shared Serve configuration.

Serve's background route persists, but the preview Node process must remain running; this setup does not install an autostart service. To remove only this route, use `tailscale serve --https=8463 off` on the host. Keep actual private hostnames in runtime configuration, not source control.

## Review and revise

- Drag to orbit, right-drag to pan, scroll to zoom. Focus the viewport for arrow keys, +/- zoom, or R to reset.
- Use Perspective, Front, Side, Roof, or Street presets. Floor cutaways remesh the remaining cells so newly exposed faces are visible.
- Presets centre and fit the selected project's dimensions. Revision changes do not refit the camera. Frame House has dedicated living-floor, bedroom-floor and roof-lounge cutaways; use Roof and zoom for furniture inspection.
- Switch revisions without moving the camera. Comparison baselines are restricted to the same project and can be selected explicitly. First submissions without another revision disable comparison.
- Click a block to see its state and owning component. The component selector outlines owned bounds, not a precise selection mesh.
- **Focus component** frames the selected component on the visible layer; **Fit model** frames all visible blocks. **Expand view** gives the model the screen; Escape returns to the workspace. Studio/warm study lighting and the grid toggle affect presentation only.
- Save the current view as a PNG carrying the revision and artifact-hash prefix.
- **Export schematic** downloads the complete selected revision as `.schem`, even while viewing a cutaway. **Source manifest** retains the complete artifact and component ownership. The panel includes its exact WorldEdit load command. Read the [export workflow](../docs/schematic-export.md) before pasting: the full rectangular volume includes air and the origin is the minimum X/Y/Z corner.
- Inspect the material schedule, or save a local review disposition and note in the assessment panel. Notes are bound to the project/artifact hash and stored in this browser only, not shared across tailnet devices. Export review downloads a JSON record including notes, hash, camera and comparison baseline. Unsaved notes prompt before revision/project changes.
- Select Light, Dark or OLED black; the preference survives reload. Press / to search the register, or open ? for camera/keyboard help.

Edit the corresponding authoring helper (`apartment.cjs`, `terrace.cjs`, or `library.cjs`), run `npm run compile`, restart `npm start` with the same runtime environment, then reload. The server intentionally loads immutable artifacts at startup; it does not hot-reload source changes. Keep a reviewed revision unchanged when authoring its successor. `catalog.cjs` owns project IDs, revision lists, metadata, and cutaway layers; adding a project also requires extending the explicit server route allowlist and a generated thumbnail for the latest revision.

Authoring helpers produce bounded plan documents. Java `PlanCompiler` validates and expands them into `generated/r0.json`, `generated/r1.json`, `generated/r2.json`, and `generated/<project>-<revision>.json` for the other projects. Preview geometry and the isolated schematic check consume those artifacts. Generated files, installed dependencies, and test screenshots stay ignored. The compiler is independent of the browser and the model provider. Rosedale Court uses a 32-block-high artifact; the viewer and mesh route select each project's declared full-building layer rather than assuming 24 blocks.

Catalogue route: `/api/projects`. Design routes: `/api/artifact/<project>/<revision>` and `/api/mesh/<project>/<revision>?ceiling=<layer>`. Legacy apartment-only API aliases remain available. The server admits only catalogue revisions/layers and caches at most 12 meshes.

## Fidelity and boundaries

Prismarine Viewer 1.33.0 supplies Minecraft 1.21.4 models/textures and its section mesher; the server target is Paper 1.21.11. Explicit block properties map through the renderer's registry. Cube/slab/stair/pane/door fixtures and every apartment cell are checked, but this does not certify all Minecraft models or final neighbor/physics behavior. Unknown blocks/states fail visibly rather than becoming substitute cubes.

`mesh.cjs` supplies a narrow variant-selection adapter because the pinned upstream selector mistakenly treats names containing `air`, including stairs, as air. A half-texel inset also keeps each face's UVs inside its texture, removing adjacent-atlas texture bleed at block seams in both the model and material icons. Geometry generation remains upstream. Biome tint is fixed to plains. Studio lighting uses stronger fill without cast shadows; warm lighting adds directional shadows. Neither reproduces the user's resource pack or shaders.

Some known block IDs need special rendering despite passing state validation:
wall signs currently produce an empty mesh. Frame House uses thin open trapdoors
for sofa arms, not invisible signs. Its furniture helper authors supported
slab/stair, carpet, lantern and fixture combinations directly into the plan.
Sign rendering/text and functional block-entity furniture remain future work.

The outer display grid is visual context only. The authored pavement/planting inside the site belongs to the proposal. Roof/floor visibility and change overlays never alter compiled cells. No approval, shared persistence, job execution, rollback, or live placement is implemented here. The browser now exports Sponge v3 schematics directly from the exact artifact; all seventeen revisions passed independent WorldEdit readback. Source data is tagged Minecraft 1.21.4/DataVersion 4189 and verified on the 1.21.11 target. Export does not include entities, sign text, inventories or biomes.

The `qs` override pins 6.16.0 to resolve dependency-audit findings. The HTTP server uses Node's native server, not the dependency's Express application. Installed assets are served locally and are not copied into source control. Review dependency notices before redistributing a packaged viewer.

## Verify

The material schedule uses locally rendered block thumbnails from the same pinned models and atlas as the main viewport. Thumbnails represent default block states (complete doors/tall plants), not every placed orientation. A single offscreen renderer and per-type session cache avoid repeated rendering. Air uses an empty marker; failed icons leave readable names and counts. The read-only `/api/material-icon/<name>` route only accepts materials present in the loaded catalogue, with a bounded-by-catalogue cache. No asset CDN or new dependency is required.

From the repository root, run `venv/bin/python -m pytest tests -q` after installing preview dependencies. Renderer tests otherwise skip; apartment/compiler tests still need Node and Java.

For served-page acceptance with an existing Playwright installation and Chromium:

```bash
export PLAYWRIGHT_MODULE=/absolute/path/to/playwright
export CHROMIUM_PATH=/absolute/path/to/chromium
node preview/check-browser.cjs
node preview/check-department.cjs
node preview/check-new-designs.cjs
node preview/check-material-icons.cjs
node preview/check-export-tools.cjs
```

The script defaults to port 8091; set `PREVIEW_TEST_URL` to check the actual HTTPS proxy origin instead. It downloads no browser and writes ignored `preview/test-output/` screenshots. See [the verification record](../docs/verification.md) for results and untested boundaries.

All scripts require the existing Playwright/Chromium environment shown above. The second covers branding/fonts, build number, theme persistence, catalogue search, project links, local notes, review export, mobile layout, help and Live/Offline behavior. The third checks the irregular R1s, six-storey apartment, enlarged BraemarHealth clinic and furnished mansion, full-height renders, roof outlines, cutaways, fixed-camera R0 comparisons, dimension-aware camera framing, dynamic site labels, nine-project register and mobile layout. The fourth checks material thumbnails and fallback behavior across the catalogue. Browser editing of building parameters is planned in [interactive-workspace.md](../docs/interactive-workspace.md), not implemented by the local notebook controls.

## Register preview images

Cards show the latest full proposal at 640 Ã— 400, with its revision label and
site dimensions. Building-use filters, case/name/site-area sorting and Records
view use the same catalogue. The site dimensions describe the authored envelope,
not a surveyed parcel or world location.

After compiling new designs and restarting the preview, generate images with
the existing Playwright/Chromium environment used for browser acceptance:

```bash
node preview/generate-thumbnails.cjs
node preview/check-register-thumbnails.cjs
node preview/check-workspace-shell.cjs
node preview/check-complete-elevations.cjs
```

These commands run from the repository root with PLAYWRIGHT_MODULE and
CHROMIUM_PATH set as above. PREVIEW_TEST_URL can select an alternate local preview.
No browser or package is downloaded by these scripts. The generator uses one
offscreen renderer serially; it checks the full mesh hash/ceiling and reuses
existing images. Output is ignored under preview/generated/thumbnails/.

The read-only image route is
`/api/thumbnail/v1/<project>/<revision>?hash=<full-artifact-hash>`.
Only loaded catalogue identities are served. Missing/malformed parameters return
400, stale hashes 409, unknown revisions/styles 404, and ungenerated images 503.
Successful PNGs use private immutable caching and an ETag; errors are not cached.
Cards load lazily and offer Retry preview without disabling project access.
The register does not fetch additional meshes or create WebGL renderers.

Bump the thumbnail style version in thumbnails.cjs and register-thumbnails.js
together when camera, lighting, resolution or texture rendering changes. Images
are keyed by both style and artifact, so a successor never inherits an old render.

Rosedale R2 and Frame House R1 are the current defaults; R1/R0 respectively remain
available for same-camera comparison. Their new rear access, privacy glazing,
joinery and domestic layouts are authored/exportable blocks, not viewer props.
