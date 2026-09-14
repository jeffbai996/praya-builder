# Praya test environment

Created 2026-09-13 from stopped live Praya. This is a separate Paper server with
copied world data, independent world UUIDs and no shared world-file inodes.

## Operator path

- In the existing Praya panel, select **Test Praya** beside **Live Praya**.
- Test panel: `https://fragserv.tailab4af9.ts.net:8474/`.
- Join in Minecraft Java 1.21.11: `fragserv.tailab4af9.ts.net:25566`.
- Live Praya's panel remains at port 8447; its game endpoint remains 25565.
- Switching modes navigates between two panel processes. RCON, power controls,
  logs, files, runtime profiles, backup jobs and audit data remain attached to
  that process's fixed target. Switching one browser tab cannot retarget another.
- Test mode is not a promotion mechanism. Nothing copies test changes back to
  the live map. Refreshing the test world from live is a separate, explicit task.

## Server and network

Host: FRAGSERV WSL. Test root: `/home/jbai/minecraft/praya-test`.
Paper build 132, Minecraft 1.21.11, Java 21. Plugin set: WorldEdit and PrayaBuilder
(plus Paper's bundled profiler). GP-AI and production integration plugins are not
loaded. Existing operators, whitelist and player files were copied.

| Purpose | Test binding |
| --- | --- |
| Player connection on Tailscale | 25566 |
| Paper internal loopback | 25567 |
| RCON loopback | 25576 |
| Builder bridge loopback | 18096 |
| Panel loopback | 5012 |
| Panel HTTPS on Tailscale | 8474 |

The public-facing test game port and internal Paper port deliberately differ.
Windows Tailscale and mirrored WSL networking otherwise collide when Paper
restarts. Tailscale Serve forwards TCP 25566 to loopback 25567. No Funnel/public
internet exposure was added.

User services:

```sh
systemctl --user status praya-test-mc.service praya-test-console.service builder-test-tunnel.service
systemctl --user restart praya-test-mc.service
journalctl --user -u praya-test-mc.service -f
```

The test server has a 1–3 GiB heap and a 4.5 GiB cgroup limit. Server and panel are
enabled for the user systemd session. The bridge tunnel follows test-server
start/stop. Live Praya was stopped when the clone began and remains stopped.

## Builder connection

Builder on fragbox uses the test bridge through the existing SSH connection,
reverse-forwarded on loopback 18096. Both construction and survey target
`praya-test`, with a newly generated world UUID. Construction remains bounded to
the earlier selected plot and its surroundings; it does not gain arbitrary
world/RCON execution. The full cloned map remains available for in-game review.

Reserved context: minimum `[-280,48,-485]`, exclusive maximum `[-237,112,-454]`.
The selected building plot is 27 by 15, with eight blocks of surrounding context.
Old live-world and synthetic surveys are retained with their original identities;
they are not silently rebound to the clone.

Studio runs under `builder-studio.service`, using `ops/run-studio.py` and the
existing private `preview/.workspace/runtime.json`. The previous runtime mapping
is retained privately in `runtime.before-praya-test-20260913.json`. Secrets are
stored outside Git. The live BlueMap link is disabled in this test integration
because it does not reflect test-world changes. No separate test BlueMap renderer
is deployed by this slice.

## Evidence and recovery

The initial clone manifest `.test-origin.json` records 2,054 copied world files
(1,542,345,102 bytes), source/copy paths and SHA-256 values. Every copied file was
checked; all three test world UUIDs differ from production. The manifest is
provenance, not a backup of subsequent test changes.

`.builder-test/verification.json` records unchanged source checksums and a
successful test-only block placement, readback and restoration. A panel-driven
restart saved all three dimensions and returned to ready state. Minecraft status
through the player-facing endpoint reports `Praya TEST - building sandbox`.

Backups triggered in Test Praya run a test-only script and write under the test
root's `backups/`. No backup timer or scheduled backup was installed. Test backup
restore is not configured; download the archive or perform a deliberate stopped
restore rather than using live-server restore scripts.

The initial test-panel config and live panel config are separate private files.
The live config before adding the environment switch is retained in its panel
data directory. Disabling test services does not stop or start production.

Validation: 59 panel tests, desktop/mobile browser mode-switch checks including
independent tabs, correct RCON/file roots, power-control placement and console
input visibility. Actual player login and architectural walkthrough remain human
acceptance steps.

## Placement interface, b20260913.01

Open a design and use **Place in world**, either beside the drawing controls or
in the mode bar. The panel shows the connected world and the design's survey.
A world-name or UUID mismatch disables preview and offers **Prepare placement
copy** using only surveys from the connected world within its reserved bounds.
Position and quarter-turn controls check every written cell, including air.
The server still checks compilation, access, protected areas and exact identity.

A placement copy keeps the original draft unchanged. When this design already
has saved versions on the target site, the new copy branches from the latest
target version. Save it, then preview; preview alone never applies blocks.
Preparation errors appear in a persistent dismissible banner and in the placement
panel. Failed previews clear the previous prepared job, preventing a stale Place
button from remaining available.

Validation on 2026-09-13:

- Readiness checks cover world/UUID identity, exact saved artifact/survey binding,
  plot bounds including explicit air, all quarter turns, and readable errors.
- Browser copy/save/reload used a temporary file store on port 8092. Terraced
  Residences R3 compiled against the copied survey at `[-272,79,-477]`, rotation
  zero, with no diagnostics and identical blocks. The original draft was unchanged.
  A subsequent placement copy could also be saved as the next target-site version.
- Browser checks cover the visible entry point, mismatch, invalid positions and
  rotation, offline/read-only states, persistent error/dismissal, and 390/320 widths.
  Light and OLED screenshots were inspected. No world-changing job route was called.
- Existing studio-polish and export browser checks passed; all 11 design-service
  and construction unit tests passed.
- A fresh read-only hash check found all 2,054 original world files unchanged;
  live Praya remained inactive and the separate test server active.

Known placement blocker: a real preview of the test copy reaches bridge validation
but is rejected for `SHORT_GRASS`. The adapter applies its tested material policy
to both the intended and prior block states, because undo must restore prior
terrain too. This UI change does not widen that policy or place the building.
Add and verify the required adapter material support before applying this design.
