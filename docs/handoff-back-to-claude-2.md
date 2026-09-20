# Review response — 2026-09-20

Reviewed `b01e99f` on `refactor/builder-foundation`, including Point Tower R3
`835c39b` and the design picker `051ec36`. This is a review response; no design
revision, world placement, service configuration change or plugin deployment was
made. The original world remains untouched.

## Findings

### R3: clear wet-room approaches are not yet demonstrated

The saved R3 artifact is reproducible from the tracked plan: 4,263 cells, hash
`98a3c5aa2b42b81af5f38366bfefcab67a956b505fa43f06cf92e3e006b2848b`.
Saved version `aa787448-13a5-46af-abb2-db9ad300ae87` and draft
`48991757-ade2-418a-a97b-d8196c6fb1df` agree. Parent remains R1
`4ab0a0e77c844e899898d8dd874d465a0f42ed291460d30b6d305dcac23b9c7d`.

Inspected the saved sheet's `plan-10`, `plan-14`, `plan-18`, `plan-22`, `plan-26`,
perspective and east elevation. Downloaded PNG checksums match the manifest.
The wet rooms read as enclosed rooms. However, the approach cells are empty
pockets rather than clear routes:

| Side | Door | Flat-side approach | Obstructions around approach |
| --- | --- | --- | --- |
| West | `[6,y,12]` | `[7,y,12]` | fern `[7,y,11]`, counter `[7,y,13]`, smoker `[8,y,12]` |
| East | `[20,y,12]` | `[19,y,12]` | fern `[19,y,11]`, counter `[19,y,13]`, cauldron `[18,y,12]` |

This repeats at `y=10,14,18` on the requested two-flat storeys. A bounded
same-floor traversal of the compiled artifact, treating doors as openable and
requiring two clear cells vertically, cannot reach either door from its flat
entrance. Removing only the corresponding fern in memory restores all six routes.
No saved geometry was changed. Source: `generate-point-tower.py:190-193`.

The existing accessibility model permits one-block upward/downward transitions
and approximates furniture as support. Its successful reachability result does
not establish an unobstructed level route through the kitchen. This is a design
clearance issue, not a claim that Minecraft players cannot jump through it.
For the next successor, relocate those ferns to a non-circulation surface and
recheck the approach at floor level before adding decorative details.

The remaining light report is one diagnostic entry covering **23 reached cells**,
not a single dark cell. `[11,10,12]` is the farthest representative point, nine
blocks from a known source. The rule measures source distance, not Minecraft
light propagation. Acceptable for retaining this study; add one restrained rear
ceiling light in the next interior pass, subject to headroom, rather than treating
this as either a placement blocker or proof of adequate lighting.

## Answers to the three questions

1. **Keep the current generator for R3.** Re-authoring an accepted shell with parts
   would create overlap and equivalence work without improving this review.
   Use parts in a fresh proposal or a separately scoped successor; retain stable
   room/component identities. Fix the specific approach issue in a successor,
   not by overwriting R3. The source emits schema v2 even though its authoring
   method remains a cell emitter; the module docstring still says R2.
2. **Keep four Recent entries, without a preference yet.** This is a short working
   set above the site groups. A setting is not warranted by the present catalogue.
   Current recency means creation or last save, not the latest unsaved edit.
   Preserve that distinction if the label or behavior is changed later.
3. **Resolve the upper layout before exterior decoration, but do not force a
   second flat into it.** The enclosed east strip is only two blocks wide beside
   the core (`x=17..18`); the remaining eastern footprint at the first setback is
   terrace. Use the strip as part of the existing dwelling: study, dining or a
   small terrace-facing room, keeping circulation and glazing clear. On the next
   floor it can be a study/dressing space rather than implying terrace access
   where there is no terrace floor. A second independent flat would need a larger
   massing/core revision to provide a credible entrance, wet room and living area.
   These are recommendations, not adopted design or canon changes.

The east flank remains substantially plain masonry, as disclosed. Once the
upper-room use is settled, align a restrained vertical recess/window treatment
with those rooms. Do not add an unrelated repeating facade grid merely to fill
blank wall.

## Design picker

No product defect found in `051ec36`. Live Studio has 39 drafts representing 15
current designs. Verified exact groups: Recent (4), Praya first plot (1), Sloping
test plot (2), Studies without a site (8). IDs inside each group are newest-first;
site groups sort by name and unsited studies follow them. Showing history appends
all 24 remaining drafts in `Earlier versions and working drafts`, newest-first.
An older deep link remains selected and carries `· currently open` when history
is hidden. Labels omit authors as intended; no browser page errors occurred.
The served `studio.js` matches the checkout byte-for-byte.

The existing test asserted counts and deep links, but not group contents or
ordering. Added that missing coverage to `preview/check-design-picker.cjs`;
expectations derive from the live context rather than fixed record counts.
Product behavior is unchanged. The repeated revision scans in `touchedAt` remain
acceptable at this scale; defer a lookup map until measured growth warrants it.

## Main, jar and running services

The supplied state is partly stale:

- `git ls-remote origin` from both hosts reports upstream main at **ea4e8c1** and
  the reviewed branch at **b01e99f**. Main contains the previous sweep, but the R3,
  picker and review-brief commits are not on it. The branch is three commits ahead.
- fragserv local main and origin/main are ea4e8c1. fragbox local main and cached
  origin/main are older, f648504. Remote truth was verified without resetting refs.
- Leave this review's test/document commits on the working branch. Main should
  wait for the next explicitly accepted milestone; no merge is performed here.
- Built jar and both deployed plugin jars have identical SHA-256:
  `da1fc6966c5d88cab5936a8e8572cc285aa753910db27b449f040a74f25627b8`.
  Previous jars remain in the external backup directory. R3/picker changes do not
  alter plugin build inputs, so the jar hash alone cannot distinguish those source
  heads. No new jar was built or copied for this review.
- Production `praya-mc` is inactive. **`praya-test-mc` is active**, contrary to the
  handoff's “servers off” snapshot. The test bridge is enabled and write-capable
  within its configured isolated world/bounds. No bridge request, placement,
  startup, stop or restart was made during this review.

## MCP exposure

`praya-mcp.service` is active/enabled and independent of the Minecraft units:
no Minecraft Wants, BindsTo or PartOf remains. The server listens on loopback;
Tailscale Serve publishes port 8451 as **tailnet-only**, with no Funnel on that
port. Read-only protocol checks passed initialization, tools/list and
`builder_context`: 19 tools (12 admin, 7 builder), with the live R3 records present.
The context returned 3 sites, 39 drafts, 24 revisions and 0 placement jobs.

Agree that this endpoint must stay off public Funnel. With unauthenticated admin
commands, the boundary is the set of tailnet principals permitted to reach it;
“tailnet-only” is not per-tool authorization. Keep access restricted to the
intended operators/bots. No authentication feature or policy change was made.

Direct MCP discovery is verified. Discovery through an actual configured squad
bot remains untested; this review did not register endpoints in bot clients.

## Review changes and verification boundary

Only picker regression coverage and this response document are changed. Saved R3,
the generator, runtime configuration, plugin jars and world files are unchanged.
The existing two untracked review-export directories are preserved.

Verified in this review: saved-plan compilation/hash, seven downloaded sheet
checksums and visual inspection, compiled-cell approach analysis, live picker
browser checks, served-source parity, Git remote refs, jar hashes, service state,
MCP discovery and context retrieval. No full-suite claim is made for this review;
the previous sweep's 211-test result is historical. No player walkthrough or
in-game door interaction was performed.

The optional cc-context `e1b2b258` and claude-bot `6f5304a` reviews were not performed.
Their inclusion in the brief is not an endorsement of those changes.

### Additional geometry and startup checks

The wet-room interiors are 2x2: west `x=4..5,z=12..13`, east
`x=21..22,z=12..13`. The brief's “two interior cells” understates their footprint.
Paired door halves have matching west/east facing and left hinges, with a plane
separating each room from its flat. The saved sheets show closed doors and do not
prove the requested opening direction. Retain door interaction and hinge
acceptance for the player walkthrough; no untested swing claim is made here.

The current test server startup log confirms PrayaBuilder v0.2.0-SNAPSHOT enabled,
the one-release `/pbuilder generate` warning was emitted, and the isolated bridge
started on its loopback port. This closes the previously unobserved-warning check.
It does **not** confirm a disabled bridge: the test bridge is intentionally enabled.
Production is off but configured to enable its bounded **read-only survey bridge**
on the next boot. The two configurations were inspected through allowlisted
non-secret values; no tokens were included in review output. Both configurations
were left as found.

## Commits and handback

- Reviewed head: `b01e99f`.
- Review test change: `0853c98` — `test(studio): assert design picker grouping and history order`.
- This response and the verification record are committed immediately after it.

The expanded picker check passed against live Studio with Node 20 and Chromium:
`39 drafts`, `15 current designs`, `4 groups`, `24 earlier drafts`, exact ordering
and both deep links. Node syntax and `git diff --check` passed. Effective Git
author identity was verified as Jeff Bai <13098134+jeffbai996@users.noreply.github.com>.
Both review commits are pushed on `refactor/builder-foundation`; the toolchain
checkout is fast-forwarded to match. Main, running services and deployed assets
are left unchanged because the review adds only test and documentation files.
