# Response handoff to Fable / claude-bot — 2026-09-18

The requested sweep is implemented and pushed on `refactor/builder-foundation`.
Main is explicitly unchanged. No world writes, placement jobs, BlueMap markers,
GP.AI changes, Minecraft plugin deployment, or Minecraft restart were performed.

## Commits

| Package | Commit | Result |
| --- | --- | --- |
| A1 + A3 | `556b348` | Located/versioned diagnostics, cap-aware context, edit provenance, CLI review |
| B2 | `7b9ae33` | Compiler resolves omitted architectural connection states |
| A2 | `aec2a9b` | Context-bound review sheets and Studio gallery |
| B1 | `2fc0d7f` | Additive schema v2 repeats, fill and parameterized calls |
| B1 follow-up | `f121f5a` | Bound even empty expansions; compact tower plan |
| B3 | `a3387f9` | Thirteen parts, generated reference and Studio insertion |
| A4 | `e3db540` | Durable blind comparison runner, review UI, explicit reveal |
| C | `a9c9785` | Seven provider-independent FastMCP tools |
| B4 | `5f5f195` | One-release legacy generation warning and README cleanup |
| Release checks | `040a789` | b20260918.01, test dependency, modes and verification |

This handoff is committed immediately after the release-check commit.

## Verification

- Full pytest suite: **211 passed, 2 skipped in 76.19s**, with Node 20, Java 21,
  Playwright and Chromium configured. Gradle build passed.
- All 42 changed JS/CJS files passed Node syntax checks. Git diff checks passed.
- Separate Minecraft-host MCP test run: **4 passed in 0.46s**, including real
  FastMCP registration. Exactly seven Builder tool names registered.
- Replayed the two unchanged failed R0 plans in an isolated workspace: cap rule
  reports Y112, and stair obstruction reports `[13,5,10]`, owner
  `switchback-stair`. Original records were not overwritten.
- All **19** current catalogue revisions retain exact serialized artifact bytes
  and hashes against the baseline. The spec's count of 17 was stale.
- Review renderer, cache/context identity, HTTP downloads and browser gallery
  checks passed. Actual HTTP fixture returned 13 views. Sheet cache backfill
  completed **23/23** saved revisions (~92 MiB); before/after hashes of existing
  sites, drafts, revisions and jobs were unchanged.
- All 13 default part fixtures compiled with zero A1 errors/warnings. Four-way
  orientation, parameter bounds, caller ownership and stair connectivity checked.
  Synthetic walking reaches both default stair assemblies' upper landings.
- Actual Studio scratch insertion at 320px: `seat.pair` at `[3,1,3]`, seven cells,
  stable component identity, valid v2 plan; no horizontal overflow. Scoped material
  changes preserve the neighboring part. Invalid candidates retain the baseline;
  Undo restores validity. Existing Studio polish checks remain green.
- Blind comparison CLI/HTTP smoke test used two local command fixtures (no model
  inference or cost), shuffled them, hid attribution, produced 13 review views,
  and revealed only on explicit request. Browser checks include stale gallery
  suppression, exact sheet identity, reveal conflicts/retry and 320px layout.
- Final public HTTPS checks from Windows: health OK, both pages show b20260918.01,
  parts registry responds and bakeoff route returns 200. Loopback health also OK.

Detailed evidence is in `docs/verification.md` and package-specific docs.

## Deliberate deviations and important semantics

1. **R1 could not keep its hash and also become correct.** The old Python resolver
   mutated palette role names during iteration, producing asymmetric pane arms
   and leaf links. R1 remains immutable at
   `4ab0a0e77c844e899898d8dd874d465a0f42ed291460d30b6d305dcac23b9c7d`.
   Corrected R2 is
   `94590e608ccf7882b924b601d97dfde98dfb6f7e0c958a409f8c1411dd241b8c`.
   All 4,079 coordinates, ownership, base materials and signs are identical;
   326 thin-block states / 386 arm values are corrected. Neither was placed.
2. R2 is now a 106-line, 59,600-byte schema-v2 plan with 94 components and
   627 source operations (510 boxes + 117 repeats), down from 1,873 operations.
3. The artifact format remains v1 even for v2 plans, preserving catalogue parity.
   Expansion guards include a separate 100,000-operation-visit ceiling so empty
   or conditional nested repeats cannot evade the primitive/cell budgets.
4. Authored connection properties win; only omitted values resolve. Walls use
   documented low/none and default up=true, not the entire vanilla tall-wall policy.
5. Sheet identity includes artifact, diagnostics, survey, transform, revision
   context and renderer version. Blind entrant labels also bind the fingerprint;
   the same geometry with changed context does not reuse stale review labels.
6. Stair parts expect the documented south-facing bottom stair palette state.
   Switchback `rise` is per flight (default 2 => total rise 4). Both flights and
   landings were corrected during review. A real player walkthrough is still due.
7. Saving now keeps the design's `author` and records the accepting actor as
   `savedBy`. MCP writes require author.agent and author.model; effort/note optional.
   Historical unknown model IDs remain unknown rather than being guessed.
8. Blind comparisons rank nothing automatically. Commands receive the brief on
   stdin and emit plan JSON on stdout. POSIX cancellation stops the process group;
   Windows currently stops only the immediate child. See `docs/bakeoffs.md`.

## Deployment and source synchronization

- Authoritative checkout: fragbox `/home/jbai/repos/praya-builder`.
- `builder-studio.service` restarted after all backend changes. Static assets and
  final backend are live at `https://fragbox.tailab4af9.ts.net:8463`.
- Private runtime configuration gained only the existing Playwright/Chromium path
  settings; no credentials were committed. Generated sheet caches remain ignored.
- Minecraft-host checkout: fragserv `/home/jbai/repos/praya-builder`, clean and
  fast-forwarded on the same branch; final handoff commit is synchronized too.
- Canonical MCP module/installer/docs live in `ops/mcp/`. Installed module and
  import in `/home/jbai/minecraft/praya/mcp`; no restart performed.
- **praya-mcp.service remains inactive.** Its service dependency can start the live
  Minecraft service, so registration was tested in-process instead. Installed does
  not mean exposed to running bot clients. Enabling the service/reconnecting bot
  clients is an explicit next operational step, with that dependency in mind.
- fragserv's builder venv initially lacked httpx; requirements-dev now pins the
  tested 0.28.1 and was installed there. Its four MCP tests then passed.
- The extra `b2/connection-states` worktree was left alone. Main was not merged.
- Disposable port-8092 Studio was stopped after checks. No bridge credentials were
  passed to it. Existing production design records were preserved.

## Next work and open decisions

No implementation package is deliberately left half-written. Remaining acceptance
requires real usage, not another green fixture:

- Enable/reconnect the MCP tools when appropriate; then exercise them through an
  actual squad bot. In-process FastMCP registration is verified, bot-client discovery
  is not. The wrapper intentionally exposes no placement/RCON operations.
- Run a genuine multi-model architecture comparison. Current smoke test validates
  orchestration and blindness, not autonomous design quality.
- Real-plot placement, BlueMap markers, live-world work and GP.AI remain paused.
  Resume only with explicit scope. A player stair/interior walkthrough remains due.
- Decide whether/when to merge this branch to main and deploy a new plugin jar.
  The legacy warning is compiled but was not observed on a running server.
- Remove `/pbuilder generate` after the promised one-release warning period.

Useful entry points: `docs/plan-schema-v2.md`, `docs/parts.md`,
`docs/parts-workflow.md`, `docs/review-sheets.md`, `docs/bakeoffs.md`,
`docs/site-design-workflow.md`, and `ops/mcp/README.md`.

## Operational note

Local Windows `wsl.exe` entry began timing out during finalization. No WSL restart
was attempted. Existing trusted SSH via fragbox reached both Linux environments,
so work and synchronization completed normally. Public HTTPS self-access from
fragbox Linux was refused while Windows access and loopback were healthy; final
public checks therefore used Windows. These transport observations do not prove
an application outage and were not used to justify restarting unrelated services.
