# B2 connection-state resolution

Date: 2026-09-18. Scope: compiler connection states only; no placement or world writes.

`PlanCompiler` resolves connection properties after every component has settled ownership and before the artifact is hashed. It fills only properties omitted by the plan. Explicit authored values remain authoritative, including deliberately unusual arms, `waterlogged`, stair facing/half and stair shape.

- Panes and iron bars connect to panes, bars, walls and full horizontal block faces.
- Walls use `low`/`none` arms for the same neighbours and default `up=true` when omitted.
- Fences connect to fences and full horizontal block faces.
- Stairs derive a missing vanilla corner `shape` from adjacent stairs with the same half.

Full-face decisions come from the tracked Minecraft 1.21.4 registry table, not block-name guesses. Regenerate it with:

```text
node preview/generate-block-face-table.cjs
```

The generator uses `minecraft-data` and `prismarine-block` collision shapes already locked by the preview. `preview/check-b2-connections.cjs` requires byte-for-byte regeneration and exact pre-B2 parity for all 19 current catalogue revisions. The work-package spec's count of 17 predates the two mansion revisions.

Point Tower R1 remains immutable at candidate `4ab0a0e77c844e899898d8dd874d465a0f42ed291460d30b6d305dcac23b9c7d`. Its hand-written resolver mutated roles while iterating, leaving asymmetric arms and connecting bars/panes to leaves. The cleaned generator emits R2 without posting it. R2 keeps every coordinate, owner, material base and sign, changes 326 thin-block states containing 386 arm corrections, and compiles to `94590e608ccf7882b924b601d97dfde98dfb6f7e0c958a409f8c1411dd241b8c`.

The Java compiler preserves legacy explicit states. The JavaScript authoring/diagnostic resolver computes semantic expected states and is version 2, so `pane.unresolved` is also rule version 2.
