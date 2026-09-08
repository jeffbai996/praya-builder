# Builder / Studio polish handoff

Prepared 2026-09-08 for the user's planned 5.1 Fable run. This is an implementation brief, not a request to launch another task automatically.

## Outcome

Make Builder feel like a calm place to look at a building, request an adjustment, compare versions and keep the result. The user likes the current direction but finds it complex and overexplained. Preserve the visual identity and working design tools; reduce the number of things competing for attention.

User feedback: “builder feels a bit complex to use ... it also kinda overexplains.” Latest small request: add padding above the selected-block “envelope” readout below the drawing. That fix is already applied: `.selection-line` has 14px top padding. The Visible layers pills also already sit in one row, with horizontal scrolling on narrow screens.

## Actual project and runtime

- Repository: `/home/jbai/repos/praya-builder` in Ubuntu-22.04 WSL, branch `refactor/builder-foundation`.
- Studio: https://fragbox.tailab4af9.ts.net:8463/studio
- Current design: https://fragbox.tailab4af9.ts.net:8463/studio?draft=45819bba-b19a-4cde-9fc4-e7158750a512#design-workspace
- Catalogue/review: same origin `/` and `/?panel=register`.
- Local server: `http://127.0.0.1:8091`, Node 20 runtime; do not use the system's older Node.
- Existing checkout includes uncommitted canon, model, signage, bridge and UI work. Inspect and preserve it. Do not reset the working tree or replace the application with a mockup.
- Start with AGENTS.md and docs/praya/README.md for Praya identity. This task is interface polish, not a change to fictional-world canon.

## Priority 1 — a simpler default workspace

The current Site / Design / Revise / Place navigation scrolls through one long page, with site capture and editing controls beside the model and construction information below. This exposes too much of the process at once, especially when the user is only experimenting with designs.

Implement a drawing-first default: current building, one version selector, the model, compact view controls, and one contextual action area. Site setup and placement should be explicit modes or collapsed panels, retaining their existing capabilities. An unbound design should still feel complete and usable; it should not look like an unfinished placement form.

Keep a direct route to site tools and construction. Preserve links/deep links for existing drafts. Do not make existing users rediscover floor cutaways, camera views or exports inside deeply nested menus.

Acceptance: opening the current design immediately shows a useful model and obvious next action. A user can switch floors, request/review a revision, save a version and export without reading a workflow essay.

## Priority 2 — concise, contextual language

Replace repeated explanations with short labels, sensible disabled states and help available on demand. Do not remove material information from the actual construction/export review.

Suggested language:
- “Working draft” -> “Design” where the context is already clear.
- “Valid candidate” -> “Ready to review”; technical validation detail under Details.
- “4,xxx cells / hash / draft version / mesh timing” -> compact optional technical readout, not a headline.
- “Prepare design handoff” should explain its real action in a short label/confirmation, such as “Prepare revision request.” This workflow exports a request for an external agent; do not imply the site has an integrated autonomous model unless one is actually implemented.
- “fetch failed” -> a concise connection state plus a Details disclosure. A disconnected world bridge should not dominate a design-only session.
- Remove redundant “Create or import a proposal” links when the same action is already visible.

Use one brief explanation at the point it helps someone choose. Avoid separate paragraphs saying the same thing in heading, hint, status and footer.

## Priority 3 — one clear version workflow

Make the distinction between editable draft and saved version understandable through behavior. Provide a compact saved/unsaved indicator, a clear Save version action, and a small version history with name, thumbnail and time. Retain immutable saved artifacts and the current undo/redo semantics.

Let the user compare with the preceding version without losing camera or cutaway state. Make changes visible through the existing diff overlay and a short human summary; raw hashes belong in Details. A rename should not silently rewrite plan identity. Handle save conflicts by preserving the user's view and offering reload/retry with an accurate explanation.

## Priority 4 — unite catalogue and Studio

The catalogue review surface and Studio currently have overlapping but different controls and vocabulary. Reuse the same camera/cutaway styling, spacing, selected states, theme behavior and download labels. Provide obvious “Edit in Studio” and “Back to projects” paths that keep the selected design.

Keep the register a useful visual library. Show recognizable thumbnails, a concise building name and latest version. De-emphasize internal plan IDs and long administrative copy.

## Priority 5 — make selection useful without becoming noisy

The “envelope · minecraft:gray_concrete · (31,2,33)” readout is useful expert information, but it need not be the default language. Show a human component label first, a material name second, and raw state/coordinates in an expandable detail view. Preserve click-to-select and component focus.

Keep the newly added spacing above this row. Give the marker and text a comfortable alignment and touch target; long material strings must wrap without crushing the buttons underneath.

## Priority 6 — inspect buildings comfortably

Keep the model as large as practical. Improve expand/focus controls and preserve the current view while switching versions. Offer clear floor choices and make interior cutaways easy to discover. Keep all four layer toggles on one row; allow local horizontal scrolling at phone widths rather than page overflow.

The Studio render runs continuously; consider pausing when the tab is hidden and rendering on interaction/settling rather than perpetually at full rate. Measure before claiming a performance win, and preserve orbit damping and screenshots. This is lower priority than workflow/copy.

## Good follow-on work, after the core polish

- A small screenshot/reference tray for the selected design and its source notes.
- Reusable sign presets from docs/praya/sign-formats.md (24,069 saved sign blocks): centered notices, framed notices, address plaques, bilingual street signs. Never invent addresses/translations.
- Clear asset support states for custom heads, signs and beds; avoid claiming unsupported world-placement behavior.
- A focused interior-fitout entry point for existing shells when that backend workflow is ready.

## Files and verification

Main UI files: preview/studio.html, preview/studio.css, preview/studio.js, preview/index.html, preview/style.css, preview/app.js, preview/scene.js. Existing browser checks under preview/check-*.cjs cover navigation, themes, capture, placement, header controls and exports. Read relevant tests before changing selectors or workflow behavior.

Review the real running UI, not only source screenshots. Validate at 320, 390, 768, 1024 and 1440 pixels, in light/dark/OLED themes. Check keyboard focus, accessible toggle names, no page overflow, error/loading/empty states, version switching, cutaway persistence, save, undo/redo and downloads. Run checks appropriate to the changes; do not build a large unrelated test suite for spacing edits.

Deliver a working local UI, a short explanation of the largest usability changes, screenshots of the key views and any remaining backend dependency. Do not deploy to the live Minecraft server as part of a polish task.

## Backend status at handoff

Wall-sign bridge support now passes unit checks and a disposable Paper integration test. The production Praya server remains unchanged. See docs/sign-bridge.md. Do not remove the new sign snapshots, text-aware comparisons or protection checks while simplifying the UI. The latest R2 draft has centered sign composition and one quartz slab connecting its AC housings.

## Status — 2026-09-08 (implemented)

Studio now opens drawing-first: model, one Design selector, cutaway and layer row, camera row, then Save version / Export schematic / Source plan. Adjust, Versions and Request a revision sit in one column beside the model; Site and Construction are explicit modes in the bar (`#site-workspace`, `#place-workspace` deep links still work). Below 1024px everything stacks with the model first.

- Copy: “Ready to review” / “Needs changes”; cells, hash and draft version live under Details; “Prepare revision request” explains that it downloads a file for an external agent; the construction bridge shows a connection state with raw detail under Details.
- Versions: saved/unsaved indicator, numbered version list with time and a browser-local thumbnail captured at save, Compare (diff overlay against any saved version via `GET drafts/{id}/diff?baseline=<hash>`, camera retained) and Open (new draft from the saved artifact). A 409 keeps the view and offers Reload design.
- Selection readout: component label · material, raw state and coordinates under Details (Studio and catalogue).
- Catalogue: “Edit in Studio” (`/studio?catalogue=<project>/<revision>`, reuses the draft already made from that revision) and the Studio register link becomes “Back to <project>” for catalogue-derived drafts.
- Rendering: the scene draws only on camera movement or state changes and never while the tab is hidden (`preview/check-studio-polish.cjs` asserts ≤6 idle frames per 2 s; orbit damping and PNG capture unchanged).
- Checks updated: `check-studio`, `check-studio-release`, `check-design-navigation`, `check-studio-placement`; new `check-studio-polish`. Not done: renaming designs, dynamic floor lists, sign presets.
