# Builder Studio — handoff for the next bot

Written 2026-09-08 evening after three polish passes on `refactor/builder-foundation` (b223fac … 3bf9589). Read this, then AGENTS.md, then docs/praya/README.md. Studio usability is the current priority; real-plot placement is parked.

## What the app is now

Two pages served by `preview/server.cjs` (Node 20, port 8091, `PREVIEW_PUBLIC_ORIGIN` must be set or the Tailscale host is refused):

- `/` catalogue: nine compiled projects, register with pre-rendered thumbnails, review panel with cutaway, cameras, lighting, exports, local notes, and "Edit in Studio".
- `/studio`: the working design tool. Three modes in the bar. **Design** is model-first: one design selector, floor cutaway, Show chips (surroundings, below ground, changes, site impact, grid), six cameras, lighting, Fit, Expand, selection readout, Save version / Export schematic / Source plan, Details (cells, hash, support badges, review metrics, findings). The column beside it holds Adjust (component, material, roof variant, sign presets, undo/redo), Versions (numbered list with stored thumbnails, Compare, Open), References (PNG/JPEG with notes) and Request a revision. **Site** holds surveys, map capture, survey import and new proposals as three steps. **Construction** holds the isolated-bridge placement flow.

Everything keeps the old element ids, so the browser checks and deep links (`?draft=`, `?site=`, `?map=`, `?job=`, `?catalogue=project/rN`, `#…-workspace`) still resolve.

## Where things live

| Concern | Files |
|---|---|
| Studio UI | preview/studio.html, studio.css, studio.js, studio-interface.js, plot-editor.js, capture-controls.js |
| Shared renderer | preview/scene.js (draws on demand; `invalidate()` after any state change), version-thumbs.js (fixed-view thumbnails), support-list.js |
| Sign presets | preview/sign-presets.js (compositions from docs/praya/sign-formats.md; user text only) |
| Support table | preview/asset-support.cjs (what signs, beds, heads support per stage; keep it backed by checks) |
| Workspace API | preview/workspace-api.cjs (drafts, revisions, diff?baseline=, support, references, thumbnails, artifacts/{hash}/mesh) |
| Design logic | preview/design-service.cjs (compile via Java PlanCli, history, save, request), construction-service.cjs (bridge) |
| Catalogue UI | preview/index.html, style.css, app.js, register-thumbnails.js, exports.js, viewer-tools.js |
| Status docs | docs/studio-polish-handoff.md (pass 1), docs/studio-sweep-2.md (pass 2 + this pass's scope) |

## Running it and checking it

```bash
# live server (already running, detached). To restart, the env it needs:
PREVIEW_PORT=8091 PREVIEW_PUBLIC_ORIGIN=https://fragbox.tailab4af9.ts.net:8463 \
BUILDER_WORKSPACE_DIR=/home/jbai/repos/praya-builder/preview/.workspace \
BUILDER_MAP_URL=https://fragserv.tailab4af9.ts.net:8448/ BUILDER_MAP_ID=world BUILDER_MAP_WORLD=world \
BUILDER_BRIDGE_URL=http://127.0.0.1:8094 BUILDER_SURVEY_URL=http://127.0.0.1:18095 \
JAVA_HOME=/home/jbai/repos/praya-builder/preview/.workspace/java21 \
setsid nohup ~/.nvm/versions/node/v20.20.2/bin/node server.cjs >> .workspace/studio.log 2>&1 < /dev/null &
# bridge and survey tokens live in preview/.workspace/runtime.json; never commit them.

# browser checks
export PLAYWRIGHT_MODULE=/home/jbai/repos/cc-context/modules/browse/node_modules/playwright
export CHROMIUM_PATH=~/.cache/ms-playwright/chromium-1226/chrome-linux64/chrome
N=~/.nvm/versions/node/v20.20.2/bin/node
# read-only, against 8091
for t in check-studio-polish check-design-navigation check-header-controls check-browser check-export-tools check-register-thumbnails check-workspace-shell; do $N preview/$t.cjs; done
$N --test preview/check-asset-support.cjs preview/check-sign-presets.cjs
# writing checks need a scratch server on 8092 with its own workspace and BUILDER_MAP_URL=https://map.example.test/
BUILDER_POLISH_WRITE=1 PREVIEW_TEST_URL=http://127.0.0.1:8092 $N preview/check-studio-polish.cjs   # rename, sign edit, references
BUILDER_WORKSPACE_DIR=<scratch> PREVIEW_BASE_URL=http://127.0.0.1:8092 $N preview/check-studio.cjs   # proposals, edit, undo, save, export
PREVIEW_BASE_URL=http://127.0.0.1:8092 $N preview/check-studio-map.cjs
```

Traps learned the hard way:
- `pkill -f "node server.cjs"` inside a heredoc kills the calling shell. Kill by port: `kill $(lsof -t -i:8091)`.
- A server started with plain `nohup` from a tool shell dies when the session ends; use `setsid`.
- Restarting without `PREVIEW_PUBLIC_ORIGIN` makes the Tailscale URL 403 while localhost looks fine. Test with `-H "Host: fragbox.tailab4af9.ts.net:8463"`.
- The scratch server needs the workspace's own Java 21; the system Java is absent.
- check-studio-capture and both placement checks need the disposable Paper bridge, which reports disconnected. Do not run them against anything else.

## Design rules that were applied (keep them)

- The model is the hero. Anything that competes with it lives in the column, behind Details, or in another mode.
- One explanation at the point of choice; no repeated hints in heading, status and footer. Sentence case. No new all-caps eyebrows (the catalogue's existing ones are its identity; leave those).
- Buttons say what happens: Save version, Preview change, Prepare revision request, Export schematic. Same word through the flow.
- Empty and error states give a next action ("Set up a site", "Reload design"), not a mood.
- Below 1024 px everything stacks; Design mode model-first, Site and Construction tools-first. The layer row scrolls locally; the page never scrolls sideways.
- Claims about placement match checks. Heads are preview-only and say so.

## Open items, in the order I'd take them

1. **Reference images in git.** docs/reference-images is 73 MB of PNGs, untracked. Canon docs link to them. Options: git LFS (not installed; installing is a system-level change, ask Jeff), commit as-is, or keep local. Jeff's call.
2. **Register thumbnails still come from generate-thumbnails.cjs.** version-thumbs.js uses the same view direction so the lists match, but a missing register PNG shows "Preview unavailable" by design (check-register-thumbnails encodes that). If you want browser fallback, change the test contract first.
3. **Commits 859e655 / a08a27f are not a clean split**: the studio.js hunks for site steps and references landed together. Harmless, noted.
4. **Sign presets are composition-only.** Any request to "fill in" a sign must come from the user's text. Address numbers and translations are never generated.
5. **Custom heads** need an in-world inventory at Oakville City Hall before any UI (docs/praya/asset-library.md).
6. **Interior fit-out** waits on existing-building survey support (docs/praya/interior-fitout.md).
7. Small polish that's fair game: keyboard focus order in Site mode's long forms; a "what changed" summary next to Save version after an edit; a phone-width version of the reference lightbox.

## State at handoff

- Branch `refactor/builder-foundation`, working tree clean except docs/reference-images.
- Live Studio: https://fragbox.tailab4af9.ts.net:8463/studio — current design 45819bba (Old Town Corner Stores R2, 5 saved versions with thumbnails).
- Workspace: 2 sites, 12 designs, 5 saved versions, thumbnails in preview/.workspace/thumbnails, references in preview/.workspace/references (empty).
- No deploy to the production Praya server happened and none should as part of UI work.
