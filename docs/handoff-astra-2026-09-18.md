# Handoff: Astra sweep on builder, 2026-09-18

Audience: Astra (Codex), taking the builder repo for one sweep before it returns to claude-bot. Written by claude. Read `AGENTS.md` and `docs/praya/README.md` first; this file only says where things stand and what to do next.

## Where things stand

- Branch: `refactor/builder-foundation`, pushed to `origin`. Head `837d63b` plus whatever this handoff commit adds. Nothing on the branch is merged to `main` (27+ commits ahead; `main` is stale and should be merged when the sweep ends, or explicitly left).
- Two working checkouts, both current: the studio host (runs `builder-studio.service` on port 8091; its `preview/.workspace/` is the live design store; restart the service after touching any `.cjs` under `preview/`, static `.js/.css/.html` are served from disk) and the Minecraft host (a fresh clone with a full toolchain for agents that cannot reach the studio, plus an empty worktree on branch `b2/connection-states`; use it or delete it). Host names, paths and the Node/Java/Playwright environment variables are in the Discord handoff message, not here.
- Tests: `venv/bin/python -m pytest tests -q -p no:cacheprovider` (184 pass), `bash gradlew --no-daemon -q build`, `node --check` on every changed `.cjs/.js`. Headless checks need `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` as documented in `docs/schematic-export.md`.
- Provenance is live. Every draft and saved version carries `author: {agent, model, effort, note}`, shown as a chip beside the design name and on version cards. Post your drafts with `"author": {"agent": "astra", "model": "<your model id>", "effort": "<effort>"}` through the API or `workspace-cli.cjs`; the studio's own actions stamp `operator`, uploads stamp `unrecorded`. Your Sep 8–9 terraced tower records were backfilled as `agent: astra, model: unrecorded`; correct them if you know the model.
- What landed tonight (all committed on the branch): Gemini credentials resolved from env or key file in both plugins; provenance; brighter greens; seal favicon; "Build" wording; inline floor cutaway; home page rhythm; the Point Tower R0/R1 study (`docs/praya/proposals/point-tower-r1.md`, `preview/designs/point-tower-2026-09-18/`); the transport roadwork prototype; the reference-images pointer in `docs/praya/sources.md`; and the spec below.

## The work: `docs/design-loop-and-vocabulary.md`

Run it in this order. Each item is one bounded session with its own acceptance list in the spec.

1. **A1 + A3** — diagnostics with rule IDs, cell locations and hints (`preview/diagnostics.cjs`, folding `accessibility.cjs` in), `site.caps` and `author` in the draft context, `author` accepted on edit, `workspace-cli.cjs review <draft>`. Acceptance: re-post the two failed Point Tower R0 attempts (the eleven-storey version above the Y112 cap, and the version whose stair infill blocked the flight below) and get `bounds.survey-cap` with the cap number, and `walk.door-unreachable` naming `[13,5,10]` as the blocker.
2. **B2** — pane, bar, wall, fence and stair connection states resolved inside `PlanCompiler.java` for palette states that omit them. Port `preview/thin-block-connections.cjs`. Seventeen catalogue artifacts must stay byte-identical. Then delete the hand-rolled resolver in `preview/designs/point-tower-2026-09-18/generate-point-tower.py` and confirm the same candidate hash.
3. **A2** — review sheet rendered on save: six exteriors, four true elevations, one plan cut per floor with diagnostics drawn on it. Content-addressed PNGs, served under `/api/workspace/artifacts/{hash}/sheet/`, listed from the draft context. Reuse `thumbnail-render.js` and the headless Chromium path in `generate-thumbnails.cjs`.
4. **B1** — plan schema v2, additive: nested repeats, `fill`, `call`.
5. **B3** — the part library (thirteen parts listed in the spec) with a passing test instantiation each.
6. **A4** — bake-off runner. Blind letters until reveal (decision taken by default; the user did not object).
7. **C (new, small)** — expose the workspace API as MCP tools for every squad bot: add `tools_builder.py` beside `tools_admin.py` in the existing Minecraft admin MCP server (FastMCP; see its `server.py`), tools `builder_context`, `builder_site`, `builder_post_plan`, `builder_edit`, `builder_review`, `builder_save`, `builder_sheet` (after A2), all thin wrappers over the studio's `/api/workspace/` routes with the `X-Builder-Write: 1` header and an `author` parameter that is required for writes. This is the "any bot, same tools" layer the user asked for; it is also the seed of the general-purpose Minecraft interface (survey, place, read back) that `TestWorldBridge` already implements for the isolated world.

Deferred, do not start: real-plot placement and BlueMap markers (paused in `AGENTS.md`), zoning, GP.AI changes.

## Decisions already taken tonight

- Legacy `/pbuilder generate` (per-block Gemini path): warn for one release, then remove (B4).
- Parts live in both the plugin jar and the workspace; jar wins on a name clash.
- Sheet volume: a dozen PNGs per save is fine.
- Reference screenshots stay untracked in `docs/reference-images/` on the studio host; link by filename.

## Rules of the road

- No live-world writes, no placement, no changes to `preview/.workspace/` in git, no reference images in git, no secrets in config. The Gemini key lives only in a mode-600 env file next to each server instance on the Minecraft host, loaded by the systemd units.
- Small conventional commits, one package per commit or two. Update `docs/verification.md` with what you actually ran. Push the branch when a package is green so both checkouts can pull.
- Every design you post carries your `author`. Every rule you add carries an ID and a version.

## Handing back to claude

The project returns to claude-bot after your sweep. Leave `docs/handoff-back-to-claude.md` with: packages completed with commit hashes, what is green, what is half-done and where it stops, any spec deviation and why, and open questions for the user. Keep the Minecraft-host clone in sync (`git pull` there) or say that it is stale.
