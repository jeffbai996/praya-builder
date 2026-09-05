# Iterative construction roadmap

## Intended experience

Supply a brief, reference screenshots or selected buildings, and a plot. The builder surveys the context, plans the building, constructs a preview, inspects the result, and revises specific components. A revision such as “widen the entrance and replace the upper-floor windows” should preserve unrelated work.

## Architecture

```text
Model agent / interactive client
             |
       bounded tool interface
             |
       building components ---- reference/style descriptions
             |
       deterministic block-state compiler
             |
       Paper / WorldEdit executor
             |
       block checks + screenshots
             |
       agent reviews and revises
```

The model should describe walls, floor layouts, repeating facade bays, roofs, and materials. Code expands repetition into exact block states. More freeform geometry can be supported without requiring the model to enumerate every final block in a single response.

The existing `BlockGenerator` interface separates the current model adapter from command/placement code. It still returns legacy grid JSON; a component-plan contract is a future, separate addition. An Astra adapter and an agent loop are not implemented by this refresh.

## Proposed tools

| Tool | Contract |
| --- | --- |
| Inspect region/reference | Return dimensions, terrain, block data and relevant examples |
| Validate/preview plan | Check limits and produce a reviewable artifact without editing the live plot |
| Apply component | Apply a bounded change with a job ID and change record |
| Inspect changes | Return what actually changed and any failures |
| Capture views | Return exterior/interior images with render freshness information |
| Undo build | Revert a recorded job, accounting for subsequent edits |
| Export schematic | Save a validated standalone artifact |

Job bounds, component IDs, block budgets, cancellation, overlap detection, and durable change records belong in the execution layer. The current player WorldEdit undo history is useful groundwork, but is not durable job rollback or conflict resolution.

## Observation and embodiment

BlueMap can provide site/exterior views once changed chunks finish rendering. Exact block data checks circulation, headroom, dimensions, and placement. A real Minecraft client is preferable for final interior and resource-pack/shader appearance.

Mineflayer is an optional avatar/navigation layer. Bulk construction can remain in WorldEdit while the character walks through buildings or performs smaller actions. Authenticated servers require a suitable authenticated account and whitelist access. A fully independent service would also require model credentials and explicit usage budgets.

## Stages

1. **Foundation — implemented, interactive verification pending:** reproducible build, regression tests, strict grid validation, provider boundary, accurate block states, and player undo recording. Build, automated regressions, and registry/schematic smoke checks pass; actual player undo and load behavior remain unverified.
2. **Components:** floor/facade/roof plans compiled into schematics, with repeatable fixture builds.
3. **Tools:** bounded region inspection and editing in an isolated world, scheduling and job rollback.
4. **Feedback:** fresh screenshots plus exact checks, followed by selective revisions.
5. **Style:** derive proportion, palette, street-interface and district conventions from references.
6. **Optional operation:** visible Mineflayer avatar and/or independent API service.

## Next implementation pass

Start with a model-independent component-to-schematic pipeline: a versioned plan with dimensions, material choices, component IDs, and repeated floor or facade elements. Compile a small fixed set of example plans into exact blocks, preserve block-state properties, and validate the resulting schematics. This gives a future model adapter a concrete output contract and avoids spending tokens on repeated individual coordinates.

Keep this first component pass in exported artifacts and an isolated test world. Add the agent tool interface and visual revision loop after the compiler and change records are testable. The current `BlockGenerator` seam is not itself an agent loop, and the 10,000-entry ceiling does not establish production-scale building quality or performance.

## First acceptance trial

Create one furnished building from representative references in an isolated test world. Inspect multiple views and request a selective revision. Evaluate block states, usable rooms and stairs, plot containment, unrelated-component preservation, rollback, server responsiveness, model usage, and architectural fit. Integration feasibility does not establish design quality; that remains a trial outcome.

## References

- [Architectural visualization workflow](https://developers.openai.com/blog/architectural-visualization-with-astra)
- [Astra model capabilities](https://developers.openai.com/api/docs/models/gpt-6-astra)
- [Codex MCP integration](https://learn.chatgpt.com/docs/extend/mcp)
- [Mineflayer](https://github.com/PrismarineJS/mineflayer)
- [Minecraft MCP reference](https://github.com/yuniko-software/minecraft-mcp-server)
- [Mindcraft](https://github.com/mindcraft-bots/mindcraft)
- [BlueMap screenshot workflow](https://bluemap.bluecolored.de/community/python-screenshots.html)
