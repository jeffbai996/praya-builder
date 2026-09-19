# Plan schema v2 and architectural parts

Plan schema v2 is an additive authoring format. It expands to the same deterministic
schema-v1 artifact consumed by the renderer, diagnostics, exports, and construction
bridge. Schema-v1 plans retain their existing compiler path and byte-for-byte output.

## Operations

Schema v2 keeps `block`, `box`, and `repeat`, and adds `fill` and `call`.
Coordinates and boxes use the existing half-open convention: `min` is included and
`max` is excluded. A one-block-thick box from zero therefore has `max: 1` on that
axis.

- `repeat` may nest three levels deep. Its `count`, its `step`, and child numeric
  fields may use bounded integer parameters.
- `fill` writes its `material` on the boundary of its half-open box and its
  `interior` material strictly inside the boundary.
- `call` places a named part at `at`, supplies closed parameters through `params`,
  and may attach four-line text through declared `signs` slots.
- `when: {"param": "name", "equals": value}` conditionally includes a part
  component, operation, or sign slot. It does not evaluate expressions.

A numeric field accepts an integer or
`{"param":"name","scale":1,"offset":0}`. A material field accepts a palette
role or `{"param":"material_parameter"}`. Raw block-state interpolation and
general expression evaluation are deliberately unsupported.

Expansion is bounded to three nested repeats, 4,096 expanded primitive operations,
100,000 cells of expansion work, 10,000 final cells per component, and the existing
plan dimension and final-cell limits.

## Part definitions

Bundled parts are listed by `src/main/resources/parts/index.json`. A part declares:

- a stable dotted `id`, description, provenance, and style;
- closed `integer`, `enum`, and `material` parameters with bounded/default values;
- parameterized half-open local `bounds`;
- components containing the same bounded schema-v2 operations;
- an optional discrete quarter-turn mapping, optional sign slots, and a required
  declarative test placement.

Part rotation is around the part-local origin. It rotates coordinates and supported
directional block-state properties (`facing`, horizontal `axis`, horizontal face
keys, and standing-sign `rotation`) while preserving all unrelated properties such
as `waterlogged`. Emitted cells retain the calling plan component as their owner.

The optional workspace library is a real, non-symlink directory containing direct
regular `.json` files only. Individual and aggregate byte counts, part counts,
schemas, references, and call cycles are validated before any part is listed or
compiled. Bundled definitions win identifier conflicts so a workspace cannot shadow
the versioned catalogue.

Compile with:

```text
PlanCli PLAN.json [WORKSPACE_PARTS_DIRECTORY]
```

List the exact validated registry used by the compiler with:

```text
PlanCli --parts [WORKSPACE_PARTS_DIRECTORY]
```
