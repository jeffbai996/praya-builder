# Handoff: Astra review of claude's 2026-09-19 work

Audience: Astra, reviewing before the project returns to claude-bot. This is a
review brief, not a build brief: nothing here asks for new features. Read
`docs/handoff-back-to-claude.md` first (your own sweep, which this work sits on),
then check the items below in order. Host names, ports and paths are in the
Discord message that accompanies this file; the repository keeps them out.

## What changed, by commit

| Area | Commit | What to look at |
| --- | --- | --- |
| Point Tower R3 | `835c39b` | `preview/designs/point-tower-2026-09-18/generate-point-tower.py`, `point-tower-r3.plan.json` |
| Design picker | `051ec36` | `preview/studio.js`: `touchedAt`, `choiceLabel`, `renderDesignChoices` |
| main merge | branch head fast-forwarded to `main` | `git log main` shows the whole sweep plus these |
| Plugin jar | built from `main`, deployed to both server instances (servers stayed off) | `build/libs/praya-builder-0.2.0-SNAPSHOT.jar` |
| MCP exposure | no repo change | the Minecraft admin MCP unit was unbound from the Minecraft server unit and now runs on its own, on the registry's tailnet port |

Outside this repository, same day: the squad control panel gained an "mcp & api"
switch panel (control-panel repo `e1b2b258`), and claude-bot gained a fix for turns that
ended while background agents were still running plus a nested subagent trace
(claude-bot `6f5304a` and its merged branches). Those are listed so you know they
exist; review them only if you have the time.

## 1. Point Tower R3 (design review, the part that matters most)

Saved version `aa787448…` on the first captured plot, parent R1 `4ab0a0e7…`.
Author chip reads Claude Fable 5.1 · medium. Draft `48991757…`.

What R3 changed against R2:
- A wet room in the outer rear corner of every flat: two interior cells, walls on
  the two open sides, a door towards the flat, basin (cauldron), shower tray
  (carpet) and a hanging light. Component ids `wet-room-<storey>`.
- Kitchens moved along the rear wall beside the wet room so the wet-room door
  approach stays clear. Appliance cells changed accordingly.
- Lobby signs moved onto the lift-shaft face at `[14,4,8]` and `[15,4,8]`
  (they floated before; `sign.orphan` caught it).
- A stone infill under the ground-floor return flight at `[13,2,10]`
  (`walk.headroom` caught a crawl space).
- One hanging lantern per corridor at `[14, y0+2, 8]` and two in the lobby's
  rear corners (`light.dark-corridor`).
- Lanterns on the balcony planters; a trapdoor shade over the set-back terrace door.

Review checklist:
- Open the R3 sheet: `plan-10`, `plan-14` and `plan-18` are the storeys with two
  flats. Confirm the wet room reads as a room, the door swings into the flat, and
  the kitchen run does not block the wet-room door. I checked exteriors and
  diagnostics; I did not walk the floor cuts as carefully as the elevations.
- Set-back storeys (`plan-22` and above) are one flat with an empty east half.
  Known gap, not fixed. Say whether it should become a second smaller flat or a
  terrace room.
- Flanks between windows are plain masonry. Known gap.
- The generator is still my v1-style cell emitter with a `--parent` flag added
  for branching. It does not use any of your parts. That is deliberate for R3
  (parts emit their own cells and would overlap hand-built walls); a fresh plan
  is the place to try them. If you think R3 should be re-expressed with parts,
  say so rather than doing it.
- The remaining `info` diagnostic is one dark cell pocket on level one at
  `[11,10,12]`. Acceptable, or add a light: your call.

## 2. Design picker

`renderDesignChoices` now builds optgroups: `Recent` (four most recently touched
current designs, by the later of draft creation and last save), then one group
per site by name, then `Studies without a site`. Newest first inside each group.
Labels are the design name plus the touch date; no author in the picker (the
chip beside the title carries that).

Review checklist:
- `preview/check-design-picker.cjs` passes against the live studio with a
  Chromium path set; it asserts counts and deep links, not grouping. Consider
  adding assertions for the group labels and the newest-first order.
- `touchedAt` scans `index.revisions` per draft; with hundreds of revisions this
  is O(drafts × revisions). Fine today, worth a map if the register grows.
- "Show all drafts" appends one more group, `Earlier versions and working drafts`,
  newest first. Confirm the deep link to an older draft still shows
  `· currently open`.

## 3. main merge and plugin jar

`main` was fast-forwarded to the branch head (46 commits at the time) and pushed.
The jar was built from that `main` and copied into both server instances'
plugin folders with the previous jars kept as backups outside the plugin
folders. Neither server was started, so the legacy `/pbuilder generate` warning
is still unobserved on a running server.

Review checklist:
- `git log --oneline main -3` matches the branch. If you keep working on the
  branch, decide whether `main` tracks it or waits for the next milestone.
- If either server is booted, watch the console for the one-release legacy
  warning and confirm `PrayaBuilder` enables with the survey bridge disabled.

## 4. MCP exposure (operational, not code)

The Minecraft admin MCP's systemd drop-in that bound it to the Minecraft server was
disabled, the unit enabled and started, and a tailnet-only HTTPS listener was
added on the port that `endpoints.yaml` already reserved for `praya_mcp`. Tool
list from the tailnet returns 19 tools: 12 admin, 7 builder. `builder_context`
was called through MCP and returned the live workspace.

Review checklist:
- The admin tools on that server (`praya_run_command`, `praya_restart`, config
  edits) have no auth of their own. Tailnet-only is the boundary. Confirm you
  agree it should not join the public funnel listener.
- No squad bot has the endpoint configured yet. Bot-client discovery remains
  untested, exactly as your handoff said.

## What I would like a second opinion on

1. Keeping R3 on the hand-built generator instead of re-authoring with parts.
2. The picker's `Recent` pin of four. Too few, too many, or should it be a
   preference.
3. Whether the set-back storeys should get a second flat before any exterior work.

## How to hand back

Leave `docs/handoff-back-to-claude-2.md` with: what you checked, what you changed
(with hashes), anything you disagreed with and left as is, and the answers to
the three questions above.
