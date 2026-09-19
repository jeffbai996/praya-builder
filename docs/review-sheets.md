# Review sheets

Open **Review sheets** under the Studio model, or choose **Review** on a saved
version. Six exterior views, four true orthographic elevations and top-down cuts
of occupied floors share the studio texture/mesh pipeline. Plans carry located
diagnostics and bounded legends. The interactive model remains available.

`GET /api/workspace/drafts/{id}/context` returns a `sheet.index` URL. Fetch it to
generate or retrieve the manifest; each view includes its PNG URL and SHA-256.
`GET /api/workspace/revisions/{id}/sheet` reviews an immutable saved version.
`node preview/workspace-cli.cjs review <draft-id> [folder]` downloads all images,
the manifest and the structured report without a user browser session.

Save schedules rendering; failure to render never discards an accepted revision.
Opening Review retries generation. One Chromium worker runs at a time, with a
60-second cap and at most four admitted requests. A full queue returns 429 and
the UI offers Retry. A completed manifest is published atomically; partial output
is removed. The server requires PLAYWRIGHT_MODULE and CHROMIUM_PATH, using the
same installed dependencies as thumbnail generation.

Sheets live under `.workspace/sheets/{artifactHash}/{reviewHash}/`. The second
hash binds diagnostic versions and source, survey hash, transform and renderer
version. The `?review=` query is essential: identical geometry on another site
must not reuse different diagnostic overlays. This is an intentional refinement
of the spec's artifact-only cache. Historical versions without a diagnostic
snapshot use current rules and say so; their original records remain unchanged.

Diagnostic markers are geometric guidance, not a player walkthrough. Sheet
generation never calls placement or world-writing endpoints.
