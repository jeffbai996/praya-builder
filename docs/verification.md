# Verification

## Foundation refresh results (2026-09-04)

| Check | Result | Scope |
| --- | --- | --- |
| Gradle build | Passed | Java 21 compilation and plugin packaging against Paper 1.21.11 / WorldEdit 7.4.0 |
| `python -m pytest tests -q` | 35 passed | Grid validation and Gemini response/loopback HTTP checks |
| Isolated Paper smoke test | `BUILDER_SMOKE_PASS` | Plugin loading, stair-state schematic round-trip, dimensions, invalid states, and existing-file preservation |
| `git diff --check` | Passed | Whitespace validation |
| Player placement/undo, permissions, load | Not yet tested | Requires the interactive checks below |

The smoke test used Paper 1.21.11 build 132 and WorldEdit 7.4.0 in a separate loopback-only server with generated test worlds. It ran without model credentials and shut itself down after the checks. No paid inference or live-world changes were used for verification. The build and 35 regressions were rerun after the final command-parser cleanup; that cleanup did not change the schematic path exercised by the smoke test.

The GitHub Actions workflow is configured to run the build and regressions. The results above are local results, not a claim that hosted CI has already passed.

## Automated regressions

Run `python -m pytest tests -q` with a Java 21 JDK available. The suite uses the existing pytest runner and JDK probes, without introducing a Java test framework. Gradle resolves the same Paper/WorldEdit dependencies used for compilation.

Coverage includes valid legacy JSON, strict dimensions and coordinates, duplicate/empty builds, block budgets, block-state text preservation, Gemini response parts/finish reasons, and local HTTP success/error paths. No model credentials or inference requests are needed.

## Isolated Paper smoke test

`./gradlew build smokeTestJar` also creates `build/libs/praya-builder-0.2.0-SNAPSHOT-smoke-test.jar`.

Use a disposable Paper 1.21.11 server directory with its own empty world, a loopback bind address and an unused port. Install WorldEdit 7.4.0, the normal plugin JAR, and the smoke-test JAR there. Do not copy production credentials or world data. Follow the normal Minecraft server EULA process.

Start that isolated server with `BUILDER_SMOKE_TEST=1` in its environment. The smoke plugin validates stair-state schematic round-trips, declared dimensions, rejection of unknown blocks/invalid properties, and preservation of existing files. It writes temporary schematics under the isolated plugins directory, logs `BUILDER_SMOKE_PASS` or `BUILDER_SMOKE_FAIL`, then shuts down that server. A zero server exit code alone is not a pass; check the marker.

Without that environment flag, the smoke plugin disables itself. Never install the smoke-test JAR on a real server.

## Remaining interactive checks before deployment

- Generate a small build and confirm the captured placement origin and world-height checks.
- Place and undo a build with an actual player; verify adjacent user changes remain intact.
- Exercise a WorldEdit change limit so a partial edit remains undoable.
- Confirm pending-request and cooldown behavior, including disconnects and world changes.
- Measure tick responsiveness at the configured block ceiling.

The registry/schematic smoke test does not cover player interaction, actual world placement/undo, permission combinations, or load performance. No visual layout or client integration changes are included in this foundation pass.
