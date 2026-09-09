# Studio camera navigation

2026-09-08: user reported text selection when dragging the preview and difficulty inspecting tall buildings while zoomed in.

Studio now offers Orbit, Pan and Free camera in the view toolbar. Pan makes the primary drag translate the viewpoint and target together, including vertical screen movement. Free camera uses drag-to-look, WASD movement, Q/E down/up, Shift for speed, and wheel forward/back. Touch-friendly step buttons provide up/down/forward/back/left/right. Escape returns to Orbit; camera presets and Fit view also restore Orbit. Navigation keys only operate while the canvas is focused, held movement clears on blur/visibility changes, and free camera movement suppresses conflicting Studio shortcuts. Block selection remains available in Orbit.

The canvas and preview region reject text selection. Drawing remains on demand when the camera is idle. No pointer lock is required. Free camera is for inspection and does not simulate collisions or player physics. Controls do not change the design or world.

Files: preview/scene.js, studio.html, studio.js, studio.css. Read-only regression: preview/check-viewer-navigation.cjs uses a valid existing draft, optionally PREVIEW_TEST_DRAFT, and PREVIEW_TEST_URL (default localhost:8091). Set PLAYWRIGHT_MODULE and CHROMIUM_PATH for the local browser runtime.

Verified new navigation regression, check-studio-polish.cjs and check-browser.cjs. Checks cover pan direction, independent free look, keyboard travel, E shortcut isolation, blur cleanup, Escape, preset/Fit recovery, idle frames, absence of selected text after dragging, and 390/320px movement buttons without horizontal page overflow. No backend restart or Minecraft changes required.
