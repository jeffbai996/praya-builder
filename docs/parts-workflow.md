# Using architectural parts

In Studio, open **Adjust → Insert architectural part**. Select a part, map its
material parameters to the design palette, choose dimensions/orientation, and
preview it. Clicking a model block supplies its plan-local position; adjust that
position to free space before inserting. Placement outside the plan or overlapping
another component fails through the normal compiler path. It never writes a world.

Each insertion creates a stable component containing a schema-v2 `call`. Existing
components remain intact. Undo/redo and Save version use the usual draft workflow.
Scoped material changes follow fill interiors and part material parameters,
including implicit defaults, without rewriting neighboring components.

`GET /api/workspace/parts` lists the exact registry loaded by Java. The draft context
links it and exposes schema versions and expansion limits. Bundled definitions win
name clashes; experiments can use `.workspace/parts/` as bounded, validated JSON.
The generated [part reference](parts.md) describes all 13 initial definitions.

Materials remain explicit caller palette choices. For stairs, use the documented
south-facing bottom stair base (`stair-up-south`); the part rotates it to the chosen
ascent direction. The switchback `rise` is **per flight**, with default 2 giving a
total rise of 4. Both default stair assemblies pass the conservative voxel walking
model, including their upper landings; a real player walkthrough is still required.
