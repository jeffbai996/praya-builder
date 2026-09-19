# Comparing design agents

`node preview/bakeoff.cjs brief.json` runs two to six explicitly supplied commands
sequentially. Each receives the common brief as JSON on stdin and must return one
plan JSON object on stdout. Commands are executable/argument arrays, not shell
strings. No inference provider is built in and the runner never chooses a winner.

```json
{
  "name": "Courtyard apartment study",
  "brief": {
    "text": "Develop a compact apartment with usable stairs and considered rear elevations.",
    "siteId": "existing-survey-id",
    "transform": {"origin": [-272, 79, -477], "turns": 0},
    "references": ["docs/reference-images/example.jpg"]
  },
  "entrants": [
    {"agent": "first-agent", "model": "actual-model-id", "effort": "high",
     "command": ["python3", "my-first-agent.py"], "timeoutMs": 600000},
    {"agent": "second-agent", "model": "actual-model-id", "effort": "high",
     "command": ["python3", "my-second-agent.py"], "timeoutMs": 600000}
  ]
}
```

Use an actual survey ID and transform from the workspace context; omit `siteId`
for an unplaced study. Reference entries are passed through to the entrant; the
runner does not upload or automatically read private reference files. Set
`BUILDER_WORKSPACE_URL` when the studio is not on localhost:8091.

The server creates a durable `.workspace/bakeoffs/` record before commands run,
then records each compiled outcome. Rows show cells, components, diagnostic counts,
walking results and review-sheet links. Failed commands do not hide successful
entrants. An interrupted run leaves its completed rows and not-yet-run entries
visible; it does not place buildings or save accepted design revisions.

The runner shuffles entrants before assigning letters. The Design library shows lettered entrants. **Reveal authors** exposes the recorded
agent/model/effort. Sheet titles use the same letters, bound into the review hash.
Blinding is a presentation feature, not access control: a single operator can still
inspect workspace files and underlying drafts. There is no automatic architectural
score or winner.

Each command has a maximum ten-minute timeout and one-MiB stdout budget. Stderr is
drained without persisting provider output. On interruption, the runner stops the
active child process group on POSIX. Windows terminates the direct child; run this
workflow in the studio's Linux environment when commands spawn descendants.

API: `GET/POST /api/workspace/bakeoffs`,
`GET /api/workspace/bakeoffs/{id}`,
`POST /api/workspace/bakeoffs/{id}/entry`, and
`POST /api/workspace/bakeoffs/{id}/reveal`. Writes use `X-Builder-Write: 1` and
entry/reveal writes require `expectedVersion`. Both entrant commands and compiler
submission use bounded queues/timeouts; renderer failures can be retried separately.
