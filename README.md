# praya-builder

> **Status: experimental, site → design → review → isolated placement implemented.** builder now adds bounded survey import, three apartment study generators, draft editing, immutable saves, a provider-independent agent interface, and durable test-world construction jobs to the existing nine-project/nineteen-revision catalogue. Real-site and player-walkthrough acceptance remain pending; autonomous neighborhood generation is not implemented. See [the site-aware workflow](docs/site-design-workflow.md).

AI-powered building generator for Minecraft Java (Paper). Translates natural language descriptions into in-game structures via the Gemini API and WorldEdit.

## Build and test

Requires a **Java 21 JDK**, Python 3.10+, Node.js 20+, and access to the dependency repositories. The build targets **Paper 1.21.11** and **WorldEdit 7.4.0**. The Gradle wrapper distribution is checksum-verified.

```bash
./gradlew build
npm --prefix preview ci --ignore-scripts
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest tests -q
```

The plugin is `build/libs/praya-builder-0.2.0-SNAPSHOT.jar`. The pytest suite compiles and runs Java probes using Gradle's resolved classpath; HTTP checks use a local test server and need no API credentials. `gradlew build` alone does not run the pytest suite. CI runs both commands.

Install the plugin alongside WorldEdit on an isolated Paper server first. The runtime dependency is now mandatory. FAWE compatibility has not been verified in this refresh.

The existing catalogue and exports retain their regression coverage. The new studio adds site, draft, assembly and job tests, served-page authoring and construction checks, and an actual isolated Paper/WorldEdit placement/readback/rollback trial. Historical schematic-readback evidence covers seventeen catalogue artifacts. Actual player interaction and real-site acceptance remain separate gates. See [verification results and scope](docs/verification.md).

## Current workspace release: 20260906.06

Open `/studio` from the sidebar for site import, apartment alternatives, component
materials and roof variants, agent revision requests, saved revisions and isolated
construction. [Configuration and API contract](docs/site-design-workflow.md).

BlueMap supports selecting two plot corners. Studio adds frontage/protected-area
marking, optional surrounding context and twice-checked capture with durable
progress, cancellation and history. The first real Praya parcel has been captured
through a read-only adapter; construction remains separately connected to the
isolated world. Surface/full-depth views retain the same complete survey.
Bespoke design and the real-plot placement/walkthrough remain the next acceptance step.

## Previous workspace release: 20260905.06

The register uses cached renders of the latest actual revisions, building-use
filters, site dimensions, sorting and compact Records view. The department mark
is a flat outline adapted from the Buildings Department mark in the Praya web
source. OLED black uses true-black workspace surfaces and model background.

Rosedale R2 adds side-bay framing, rear loggias and complete studio wet rooms.
Frame House R1 adds timber side screens, a rear colonnade, garden/gallery terraces
and interior joinery. The seventeen prior artifacts remain byte-identical.
See [release verification](docs/verification.md) and [preview image generation](preview/README.md#register-preview-images).

## Browser design review

```bash
cd preview
npm ci --ignore-scripts
npm run compile
npm start
```

Open **http://127.0.0.1:8091** on the same PC. The viewer includes camera presets, orbit/pan/zoom, floor cutaways, component picking/focus, fit-to-view, an expanded model view, studio/warm lighting, fixed-camera revision comparison, change overlays, PNG export and `.schem` downloads. It makes no model calls or world edits. See the [schematic export workflow](docs/schematic-export.md) for source manifests, origin/air behavior and isolated test placement.

The **builder** workspace uses a DM Sans wordmark and body text, Urbanist headings, light/neutral-charcoal themes and a visible release build number. The project register includes Courtyard Apartments, Terrace Mews, Civic Reading Room, Garden Medical Clinic, Go Corner Market, Parkside Elementary and Rosedale Court. The clinic, market and school now have irregular-footprint R1s; Rosedale Court is a six-storey postmodern apartment proposal. The [proposal briefs](docs/design-proposals.md) describe their programmes and reference language. Review notes/dispositions are stored only in the current browser and bound to the artifact hash; Export review downloads a portable JSON record. Live/Offline indicates the workspace-server connection, not a Minecraft connection.

The proposal is a synthetic 32 × 32-block site with three residential floors, six units, and a roof terrace. R1 adds planted balconies, an entrance canopy, and a softer frontage. R2 modernizes the facade and roof canopy while retaining the apartment layout. All three revisions come from the same Java compiler used by the schematic smoke test—not a separate visual approximation of the design. Models/textures use Minecraft 1.21.4 assets for the tested palette; this is not a reproduction of in-game shaders or physics.

The additional **BraemarHealth Hillside Clinic** (`?project=braemar`) retains the supplied medical-centre reference's three clinical floors, projecting glazed wing, split-colour mark and planted frontage. Its latest R2 adds a postmodern entrance arch, tower oculus, warm masonry and stepped cornice while removing all BH/CLINIC lettering. The logo is the sole exterior identity. The original Garden Medical Clinic remains available separately.

BraemarHealth R1 enlarges the clinic on a 36 × 36 site, uses smoked panes with
deliberate clear-pane exceptions, corrects the logo and adds flush block-built
signage. R2 supersedes that signage direction; R0/R1 remain unchanged for comparison. New designs follow the standing
[building style rules](docs/building-style.md).

**Rosedale Court R1** (`?project=postmodern`) replaces the rejected style with a
new six-storey Praya design: charcoal walls, deep pale framing, smoked-pane
balconies, selective brick and asymmetric planted setbacks. The old arch and
ornamental crown are gone. R0 remains available only as a historical comparison.

Private access from other devices is supported through Tailscale Serve with an exact runtime-configured HTTPS origin; see [tailnet setup](preview/README.md#private-tailnet-access). The application remains bound to loopback and does not enable public Funnel access.

**Braemar Frame House** (`?project=mansion`) adds a 44 × 40 garden residence with
a broad pale frame, smoked panes, double-height dining hall, three bedrooms, pool
and roof lounge. Living, bedroom and roof-pavilion cutaways expose detailed
furniture: thin trapdoor armrests, layered bedding, lamps, desks, cupboards,
basins and showers. These are compiled blocks, not preview-only props. The new
mansion has compiler, browser and full-volume schematic-readback verification;
in-game visual/player inspection is still pending.

See [preview setup and revision workflow](preview/README.md) for editing, restarting, and verification.

The [interactive authoring plan](docs/interactive-workspace.md) defines the next parameter-editing, draft/revision, shared-review, and isolated-construction stages, grounded in the department's public canon.

The broader [Buildings Department workspace roadmap](docs/department-workspace.md)
connects sites, project files, design, plan checking, reviews, construction,
inspections and confirmed building records in one tool. Those future modules
share a case/evidence model; they are not implemented by the current viewer.

The planned [site-survey layer](docs/site-context.md) will retrieve a selected map
area, inspect plot boundaries, terrain/slope, access and neighbouring structures,
and preview site-adapted buildings in their actual surroundings. A bounded
offline extract is the first gate; read-only live retrieval and zoning/parcel
proposals follow. This is roadmap work, not implemented map access or placement.

## Upgrading from 0.1.0

- Keep the existing configuration; startup does not overwrite it. `limits.max-blocks` defaults to 10,000 when absent.
- Use Java 21, Paper 1.21.11, and WorldEdit 7.4.0 for the documented target. WorldEdit is a required plugin dependency.
- Previously clipped coordinates, duplicate entries, invalid dimensions, and invalid blocks now reject the build. Valid older JSON remains supported, including omitted dimensions.
- Schematic exports refuse an existing filename. Choose a different building name or manage the existing artifact explicitly.
- Place only the normal plugin JAR in a deployment. The separate `-smoke-test.jar` is for disposable test servers.

This refresh has not been deployed to a live world. Complete the [remaining interactive checks](docs/verification.md#remaining-interactive-checks-before-deployment) in a test world before replacing an installed plugin.

## Configuration and use

Set `GEMINI_API_KEY` in the server process environment, or retain the existing `gemini.api-key` configuration. The environment takes precedence. The Java plugin does not load `.env` files itself. Keep credentials out of version control.

The model remains configurable through `gemini.model`; existing configurations are not overwritten. The bundled default is `gemini-2.5-flash`. Changing to a different provider requires an implementation of `BlockGenerator`, not just a model-name edit.

Player commands (permission: `prayabuilder.use`, granted to operators by default):

```text
/pbuilder generate small stone pavilion
/pbuilder generate -save small stone pavilion
```

Generation runs off the server thread. A player may have one request in flight, plus the configured cooldown. A successful response is validated as a complete grid before being handed to the server thread for state resolution and placement or export.

Direct placement uses the location captured when the request started, and requires the player to remain in that world. Changes are recorded in the player's WorldEdit history for `//undo`. Existing blocks at generated positions can be replaced; this is not a protected-plot editor. Placement failures can leave partial changes in undo history. Undo still requires the relevant WorldEdit permission.

`-save` writes a Sponge v3 `.schem` under `plugins/PrayaBuilder/schematics/`, without changing the world. Existing files with the same sanitized name are rejected, not overwritten. This is a separate directory from WorldEdit's schematic folder.

## Grid contract

```json
{
  "name": "Example pavilion",
  "dimensions": {"x": 2, "y": 1, "z": 1},
  "blocks": [
    {"x": 0, "y": 0, "z": 0, "block": "minecraft:stone"},
    {"x": 1, "y": 0, "z": 0, "block": "minecraft:stone_brick_slab[type=top,waterlogged=false]"}
  ]
}
```

Y is vertical. Dimensions must be positive integers within the configured limits; coordinates must be unique integers within those dimensions. Valid legacy grids without `dimensions` use the configured maximum dimensions. Invalid dimensions, coordinates, duplicates, malformed states, empty grids, and oversized block lists reject the whole build. Invalid block names/properties are rejected by the server registry before editing, rather than silently replaced with stone.

Defaults are 48 × 64 × 48 and **10,000 block entries**. Existing configs without `limits.max-blocks` receive that fallback. Block-state properties are preserved in placement/export. Palette entries guide the model prompt; they are not an enforced material allowlist. Block-entity data such as sign text and chest contents is not supported.

## Limitations

- Previous experiments reported useful results around 1,000 blocks and truncation with larger builds. The new entry limit is a workload ceiling, not a quality guarantee; model output is still one entry per block.
- The browser supports authored component revisions, but there is no world survey, automatic screenshot interpretation, construction queue, or external agent endpoint. The existing generation command remains player-only and does not consume component plans.
- World edits still run synchronously. Do not raise the block ceiling to city-scale values; bounded scheduling belongs in the next stage.
- Network requests have a 60-second timeout. HTTP failures, non-success finish reasons, empty text, and malformed responses are reported. Retries are not automatic, avoiding duplicate paid requests.
- Air is omitted by the generation prompt, so direct placement does not clear existing rooms. Exported clipboards contain air at unspecified positions; use the appropriate WorldEdit paste options.

## Tools

`tools/preview.py` is the original standalone Gemini/Matplotlib experiment. It has its own prompt/client and renders approximate colored voxels, not Minecraft block models. It is not the authoritative validation or visual-feedback path. `--file` avoids a paid generation request. See `tools/requirements.txt` for its optional dependencies.

Implemented stages and the remaining agent architecture are in [docs/agent-roadmap.md](docs/agent-roadmap.md). Isolated-server checks are described in [docs/verification.md](docs/verification.md).
