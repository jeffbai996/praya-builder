# praya-builder

> **Status: experimental, foundation refreshed.** The 0.2.0 snapshot adds strict validation, a provider boundary, block-state handling, undo recording, and regression tooling. The generator remains a one-response prototype; autonomous building and visual feedback are not implemented yet.

AI-powered building generator for Minecraft Java (Paper). Translates natural language descriptions into in-game structures via the Gemini API and WorldEdit.

## Build and test

Requires a **Java 21 JDK**, Python 3.10+, and access to the Gradle dependency repositories. The build targets **Paper 1.21.11** and **WorldEdit 7.4.0**. The Gradle wrapper distribution is checksum-verified.

```bash
./gradlew build
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest tests -q
```

The plugin is `build/libs/praya-builder-0.2.0-SNAPSHOT.jar`. The pytest suite compiles and runs Java probes using Gradle's resolved classpath; HTTP checks use a local test server and need no API credentials. `gradlew build` alone does not run the pytest suite. CI runs both commands.

Install the plugin alongside WorldEdit on an isolated Paper server first. The runtime dependency is now mandatory. FAWE compatibility has not been verified in this refresh.

The foundation refresh passed 35 automated regressions and an isolated Paper registry/schematic smoke test. Player placement/undo and load behavior still need interactive verification before deployment. See [verification results and scope](docs/verification.md#foundation-refresh-results-2026-09-04).

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
- No world survey, screenshot input, component revisions, construction queue, or external agent endpoint exists yet. The command is player-only.
- World edits still run synchronously. Do not raise the block ceiling to city-scale values; bounded scheduling belongs in the next stage.
- Network requests have a 60-second timeout. HTTP failures, non-success finish reasons, empty text, and malformed responses are reported. Retries are not automatic, avoiding duplicate paid requests.
- Air is omitted by the generation prompt, so direct placement does not clear existing rooms. Exported clipboards contain air at unspecified positions; use the appropriate WorldEdit paste options.

## Tools

`tools/preview.py` is the original standalone Gemini/Matplotlib experiment. It has its own prompt/client and renders approximate colored voxels, not Minecraft block models. It is not the authoritative validation or visual-feedback path. `--file` avoids a paid generation request. See `tools/requirements.txt` for its optional dependencies.

The proposed agent architecture and milestones are in [docs/agent-roadmap.md](docs/agent-roadmap.md). Isolated-server checks are described in [docs/verification.md](docs/verification.md).
