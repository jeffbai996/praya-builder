#!/usr/bin/env python3
"""Point tower R0 for the Praya first plot (site cap: Y112, so 33 blocks above ground). Emits a plan and posts a draft."""
import json, sys, urllib.request, os
from collections import defaultdict

BASE = os.environ.get("BUILDER_WORKSPACE_URL", "http://127.0.0.1:8091")
SITE = "123209e7-10ec-4b90-bd77-312645d79af2"
ORIGIN = [-272, 79, -477]
DIMS = (27, 33, 15)

P = {
    "air": "minecraft:air",
    "stone": "minecraft:polished_deepslate",
    "stone-dark": "minecraft:deepslate_tiles",
    "frame": "minecraft:smooth_quartz",
    "frame-slab": "minecraft:smooth_quartz_slab[type=bottom,waterlogged=false]",
    "frame-slab-top": "minecraft:smooth_quartz_slab[type=top,waterlogged=false]",
    "brick": "minecraft:bricks",
    "slab-edge": "minecraft:polished_deepslate",
    "floor": "minecraft:birch_planks",
    "lobby-floor": "minecraft:polished_diorite",
    "paving": "minecraft:stone_bricks",
    "planter": "minecraft:spruce_leaves[distance=1,persistent=true,waterlogged=false]",
    "fern": "minecraft:potted_fern",
    "timber": "minecraft:stripped_spruce_log[axis=y]",
    "shade-e": "minecraft:spruce_trapdoor[facing=east,half=top,open=true,powered=false,waterlogged=false]",
    "shade-w": "minecraft:spruce_trapdoor[facing=west,half=top,open=true,powered=false,waterlogged=false]",
    "lantern": "minecraft:lantern[hanging=false,waterlogged=false]",
    "lantern-hang": "minecraft:lantern[hanging=true,waterlogged=false]",
    "sea-lantern": "minecraft:sea_lantern",
    "stair-s": "minecraft:smooth_quartz_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]",
    "stair-n": "minecraft:smooth_quartz_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]",
    "door-n-lower": "minecraft:spruce_door[facing=north,half=lower,hinge=left,open=false,powered=false]",
    "door-n-upper": "minecraft:spruce_door[facing=north,half=upper,hinge=left,open=false,powered=false]",
    "door-w-lower": "minecraft:spruce_door[facing=west,half=lower,hinge=left,open=false,powered=false]",
    "door-w-upper": "minecraft:spruce_door[facing=west,half=upper,hinge=left,open=false,powered=false]",
    "door-e-lower": "minecraft:spruce_door[facing=east,half=lower,hinge=left,open=false,powered=false]",
    "door-e-upper": "minecraft:spruce_door[facing=east,half=upper,hinge=left,open=false,powered=false]",
    "sign-n": "minecraft:spruce_wall_sign[facing=north,waterlogged=false]",
    "sign-s": "minecraft:spruce_wall_sign[facing=south,waterlogged=false]",
    "counter": "minecraft:spruce_slab[type=top,waterlogged=false]",
    "seat-n": "minecraft:spruce_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]",
    "seat-s": "minecraft:spruce_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]",
    "bed-foot": "minecraft:blue_bed[facing=south,occupied=false,part=foot]",
    "bed-head": "minecraft:blue_bed[facing=south,occupied=false,part=head]",
    "carpet": "minecraft:light_gray_carpet",
    "bookshelf": "minecraft:bookshelf",
    "smoker": "minecraft:smoker[facing=north,lit=false]",
    "cauldron": "minecraft:water_cauldron[level=3]",
    "table": "minecraft:spruce_trapdoor[facing=north,half=top,open=false,powered=false,waterlogged=false]",
}
PANE = {"pane": "minecraft:black_stained_glass_pane", "pane-privacy": "minecraft:light_gray_stained_glass_pane",
        "pane-clear": "minecraft:glass_pane", "bars": "minecraft:iron_bars"}
CONNECTS = {"stone", "stone-dark", "frame", "brick", "slab-edge", "timber", "planter", "bookshelf"} | set(PANE)

cells, comp_order = {}, []
def put(comp, x, y, z, role):
    if not (0 <= x < DIMS[0] and 0 <= y < DIMS[1] and 0 <= z < DIMS[2]):
        raise SystemExit(f"out of bounds {(x, y, z)} in {comp}")
    if comp not in comp_order: comp_order.append(comp)
    cells[(x, y, z)] = (role, comp)
def box(comp, x0, y0, z0, x1, y1, z1, role):
    for y in range(y0, y1):
        for z in range(z0, z1):
            for x in range(x0, x1): put(comp, x, y, z, role)

# ---------- massing ----------
PX0, PX1, PZ0, PZ1 = 1, 26, 4, 15          # podium (single storey, lobby)
TX0, TX1, TZ0, TZ1 = 3, 24, 6, 15          # tower
STOREY, GROUND, TOWER_BASE, TOWER_STOREYS = 4, 1, 5, 6
SETBACK_FROM, SETBACK = 4, 4               # top two storeys step back 4 on the east
ROOF = TOWER_BASE + TOWER_STOREYS * STOREY  # 29
CX0, CX1, CZ0, CZ1 = 10, 17, 8, 12         # core: walls x10/x16, z11; corridor row z8; stairs z9..10
def tower_x1(s): return TX1 - SETBACK if s >= SETBACK_FROM else TX1
def rect_wall(comp, x0, z0, x1, z1, y0, y1, role):
    box(comp, x0, y0, z0, x1, y1, z0 + 1, role); box(comp, x0, y0, z1 - 1, x1, y1, z1, role)
    box(comp, x0, y0, z0, x0 + 1, y1, z1, role); box(comp, x1 - 1, y0, z0, x1, y1, z1, role)

# ---------- forecourt: paved approach, retained trees, lanterns ----------
box("forecourt-path", 12, 0, 0, 16, 1, PZ0, "paving")
for x in (11, 16):
    for z in (0, 3):
        put("forecourt-lighting", x, 0, z, "paving"); put("forecourt-lighting", x, 1, z, "lantern")
box("forecourt-planting", 1, 0, 3, 11, 1, 4, "planter"); box("forecourt-planting", 17, 0, 3, 26, 1, 4, "planter")

# ---------- podium: double-lit lobby, y1 slab, walls y2..4, roof terrace slab y5 ----------
box("podium-slab", PX0, GROUND, PZ0, PX1, GROUND + 1, PZ1, "lobby-floor")
rect_wall("podium-slab", PX0, PZ0, PX1, PZ1, GROUND, GROUND + 1, "slab-edge")
y0, y1 = GROUND + 1, GROUND + STOREY
for x in range(PX0, PX1):
    pier = (x - PX0) % 3 == 0 or x == PX1 - 1
    box("podium-frontage", x, y0, PZ0, x + 1, y1, PZ0 + 1, "frame" if pier else ("pane-clear" if 9 <= x <= 17 else "pane"))
for x in range(PX0, PX1):
    box("podium-rear-wall", x, y0, PZ1 - 1, x + 1, y1, PZ1, "brick" if x in (CX0, CX1 - 1) else ("frame" if (x - PX0) % 3 == 0 or x == PX1 - 1 else ("pane-privacy" if (x - PX0) % 3 == 2 else "stone")))
for z in range(PZ0 + 1, PZ1 - 1):
    role = "pane" if (z - PZ0) % 4 in (2, 3) else "stone"
    box("podium-side-walls", PX0, y0, z, PX0 + 1, y1, z + 1, role); box("podium-side-walls", PX1 - 1, y0, z, PX1, y1, z + 1, role)
for x in (13, 14):
    put("entrance", x, 2, PZ0, "door-n-lower"); put("entrance", x, 3, PZ0, "door-n-upper"); put("entrance", x, 4, PZ0, "frame")
put("entrance", 12, 4, PZ0, "frame"); put("entrance", 15, 4, PZ0, "frame")
box("entrance-canopy", 11, 5, 1, 17, 6, PZ0, "frame-slab-top")
for x in (11, 16): box("entrance-canopy", x, 1, 1, x + 1, 5, 2, "timber")
box("podium-roof", PX0, TOWER_BASE, PZ0, PX1, TOWER_BASE + 1, PZ1, "slab-edge")
for x in range(PX0, PX1):
    for z in range(PZ0, PZ1):
        if TX0 <= x < TX1 and TZ0 <= z < TZ1: continue
        if x in (PX0, PX1 - 1) or z in (PZ0, PZ1 - 1): put("terrace-parapet", x, TOWER_BASE + 1, z, "bars")
        elif z == PZ0 + 1 and 4 <= x <= 22 and x not in (12, 13, 14): put("terrace-planting", x, TOWER_BASE + 1, z, "planter")
# lobby fit-out
box("lobby", 4, 2, 8, 8, 3, 9, "counter"); put("lobby", 4, 2, 7, "seat-s"); put("lobby", 5, 2, 7, "seat-s")
box("lobby", 18, 2, 7, 23, 3, 8, "seat-n"); put("lobby", 20, 2, 8, "table")
for x in (2, 24): put("lobby", x, 2, 6, "planter")
for x in (7, 13, 19): put("lobby-lighting", x, 4, 6, "lantern-hang")
put("lobby", 13, 4, CZ0 - 1, "sign-n"); put("lobby", 14, 4, CZ0 - 1, "sign-n")

# ---------- tower storeys ----------
for s in range(TOWER_STOREYS):
    base = TOWER_BASE + s * STOREY; x1 = tower_x1(s); y0, y1 = base + 1, base + STOREY
    if s > 0:
        box(f"tower-slab-{s}", TX0, base, TZ0, x1, base + 1, TZ1, "floor")
        rect_wall(f"tower-slab-{s}", TX0, TZ0, x1, TZ1, base, base + 1, "slab-edge")
    # north: pale piers (two deep) at the slab line, black panes recessed one block, bar rail on the ledge
    for x in range(TX0, x1):
        if (x - TX0) % 3 == 0 or x == x1 - 1:
            box(f"tower-north-piers-{s}", x, y0, TZ0, x + 1, y1, TZ0 + 2, "frame")
        else:
            box(f"tower-north-glazing-{s}", x, y0, TZ0 + 1, x + 1, y1, TZ0 + 2, "pane")
            put(f"tower-north-rail-{s}", x, y0, TZ0, "bars")
    # rear: same pier rhythm as the street in charcoal + pale, privacy panes, brick only as two blades at the core lines
    for x in range(TX0, x1):
        if x in (CX0, CX1 - 1): role = "brick"
        elif (x - TX0) % 3 == 0 or x == x1 - 1: role = "frame"
        else: role = "pane-privacy"
        box(f"tower-rear-{s}", x, y0, TZ1 - 1, x + 1, y1, TZ1, role)
    # flanks: charcoal masonry, punched windows, timber shades
    balcony = s in (1, 2, 3)
    bz0 = 7 if s == 2 else 8
    for z in range(TZ0 + 1, TZ1 - 1):
        window = (z - TZ0) % 3 == 2
        role = "pane" if window else "stone"
        box(f"tower-side-walls-{s}", x1 - 1, y0, z, x1, y1, z + 1, role)
        if window: put(f"tower-shades-{s}", x1, y1 - 1, z, "shade-e")
        if balcony and bz0 <= z <= bz0 + 4: continue
        box(f"tower-side-walls-{s}", TX0, y0, z, TX0 + 1, y1, z + 1, role)
        if window: put(f"tower-shades-{s}", TX0 - 1, y1 - 1, z, "shade-w")
    if balcony:
        box(f"west-balcony-{s}", TX0 - 2, base, bz0, TX0, base + 1, bz0 + 5, "slab-edge")
        box(f"west-balcony-{s}", TX0 - 2, base + 1, bz0, TX0 - 1, base + 2, bz0 + 5, "bars")
        for z in (bz0, bz0 + 4): put(f"west-balcony-{s}", TX0 - 1, base + 1, z, "planter")
        box(f"tower-side-walls-{s}", TX0, y0, bz0, TX0 + 1, y1, bz0 + 2, "pane"); box(f"tower-side-walls-{s}", TX0, y0, bz0 + 3, TX0 + 1, y1, bz0 + 5, "pane")
        put(f"west-balcony-{s}", TX0, base + 1, bz0 + 2, "door-w-lower"); put(f"west-balcony-{s}", TX0, base + 2, bz0 + 2, "door-w-upper"); put(f"tower-side-walls-{s}", TX0, base + 3, bz0 + 2, "frame")
    # core walls (x10, x16, south z11), lift shaft x14..15 z9..10, flat doors off the corridor row z8
    box(f"core-{s}", CX0, y0, CZ0, CX0 + 1, y1, CZ1, "stone"); box(f"core-{s}", CX1 - 1, y0, CZ0, CX1, y1, CZ1, "stone")
    box(f"core-{s}", CX0, y0, CZ1 - 1, CX1, y1, CZ1, "stone"); box(f"core-{s}", 14, y0, 9, 16, y1, 11, "stone-dark")
    box(f"core-{s}", CX0 + 1, y0, CZ0 - 1, CX1 - 1, y1, CZ0, "stone")   # corridor north wall along z7 (behind glazing)
    put(f"flat-doors-{s}", CX0, y0, CZ0, "door-w-lower"); put(f"flat-doors-{s}", CX0, y0 + 1, CZ0, "door-w-upper")
    put(f"flat-doors-{s}", CX1 - 1, y0, CZ0, "door-e-lower"); put(f"flat-doors-{s}", CX1 - 1, y0 + 1, CZ0, "door-e-upper")
    # flats: west x4..9 (+ south band to x12), east x17..x1-2 (+ south band from x13); top storeys are one flat
    single = s >= SETBACK_FROM
    if single:
        cells.pop((CX1 - 1, y0, CZ0)); cells.pop((CX1 - 1, y0 + 1, CZ0)); box(f"core-{s}", CX1 - 1, y0, CZ0, CX1, y0 + 2, CZ0 + 1, "stone")
    else:
        box(f"flat-partitions-{s}", 13, y0, CZ1, 14, y1, TZ1 - 1, "stone")
    flats = [(TX0 + 1, CX0)] + ([] if single else [(CX1, x1 - 1)])
    for fx0, fx1 in flats:
        west = fx0 == TX0 + 1
        far = fx0 if west else fx1 - 1                      # bed against the outer flank, away from the door
        put(f"flat-fitout-{s}", far, y0, 8, "bed-head"); put(f"flat-fitout-{s}", far, y0, 9, "bed-foot"); put(f"flat-fitout-{s}", far, y0, 10, "bookshelf")
        sx = far + 2 if west else far - 2
        put(f"flat-fitout-{s}", sx, y0, 9, "seat-s"); put(f"flat-fitout-{s}", sx, y0, 10, "table"); put(f"flat-fitout-{s}", sx + (1 if west else -1), y0, 10, "carpet")
        put(f"flat-fitout-{s}", sx, y0, 12, "fern")
        kx = fx0 if west else fx1 - 3
        box(f"flat-fitout-{s}", kx, y0, TZ1 - 2, kx + 3, y0 + 1, TZ1 - 1, "counter")
        put(f"flat-fitout-{s}", kx + (0 if west else 2), y0, TZ1 - 3, "smoker"); put(f"flat-fitout-{s}", kx + 1, y0, TZ1 - 3, "cauldron")
    put(f"wayfinding-{s}", 12, y0 + 2, CZ0, "sign-s")

# ---------- switchback stair: run A x11 (z9,z10) up, landing x12 z10, run B x13 (z10,z9) up, exit x13 z8 ----------
levels = [GROUND] + [TOWER_BASE + s * STOREY for s in range(TOWER_STOREYS)]
for i, lvl in enumerate(levels[:-1]):
    nxt = levels[i + 1]
    put("switchback-stair", 11, lvl, 9, "stair-s"); put("switchback-stair", 11, lvl + 1, 10, "stair-s")   # run A up, southward
    put("switchback-stair", 12, lvl + 1, 10, "stone")                                                     # half landing
    put("switchback-stair", 13, lvl + 2, 10, "stair-n"); put("switchback-stair", 13, lvl + 3, 9, "stair-n")  # run B up, northward
    for (xx, zz) in ((13, 9), (13, 10), (12, 10)): put("switchback-stair", xx, nxt, zz, "air")             # stairwell opening in the slab above
# ground-floor core (lobby level): same walls, open to the lobby on the north
y0, y1 = GROUND + 1, GROUND + STOREY
box("podium-core", CX0, y0, CZ0, CX0 + 1, y1, CZ1, "stone"); box("podium-core", CX1 - 1, y0, CZ0, CX1, y1, CZ1, "stone")
box("podium-core", CX0, y0, CZ1 - 1, CX1, y1, CZ1, "stone"); box("podium-core", 14, y0, 9, 16, y1, 11, "stone-dark")

# ---------- roof: pale crown, screened plant, corner lights; east setback terrace ----------
top_x1 = tower_x1(TOWER_STOREYS - 1)
box("roof-slab", TX0, ROOF, TZ0, top_x1, ROOF + 1, TZ1, "slab-edge")
for x in range(TX0, top_x1):
    for z in range(TZ0, TZ1):
        if x in (TX0, top_x1 - 1) or z in (TZ0, TZ1 - 1):
            put("roof-crown", x, ROOF + 1, z, "frame"); put("roof-crown", x, ROOF + 2, z, "frame-slab")
box("roof-screen", CX0, ROOF + 1, CZ0, CX1, ROOF + 3, CZ1, "timber"); box("roof-screen", CX0 + 1, ROOF + 1, CZ0 + 1, CX1 - 1, ROOF + 3, CZ1 - 1, "air")
box("roof-screen", CX0, ROOF + 3, CZ0, CX1, ROOF + 4, CZ1, "frame-slab")
for x in (TX0 + 1, top_x1 - 2):
    put("roof-lighting", x, ROOF + 2, TZ0 + 1, "sea-lantern"); put("roof-lighting", x, ROOF + 2, TZ1 - 2, "sea-lantern")
sb = TOWER_BASE + SETBACK_FROM * STOREY
box("setback-terrace", TX1 - SETBACK, sb, TZ0, TX1, sb + 1, TZ1, "slab-edge")
for z in range(TZ0, TZ1): put("setback-terrace", TX1 - 1, sb + 1, z, "bars")
for x in range(TX1 - SETBACK, TX1 - 1):
    put("setback-terrace", x, sb + 1, TZ0, "bars"); put("setback-terrace", x, sb + 1, TZ1 - 1, "planter")
put("setback-terrace", TX1 - SETBACK - 1, sb + 1, 10, "door-e-lower"); put("setback-terrace", TX1 - SETBACK - 1, sb + 2, 10, "door-e-upper")

# ---------- survey clearance ----------
site = json.load(urllib.request.urlopen(f"{BASE}/api/workspace/sites/{SITE}", timeout=30))
ox, oy, oz = site["origin"]
def inside_built(x, y, z):
    if PX0 <= x < PX1 and PZ0 <= z < PZ1 and 1 <= y < TOWER_BASE + 3: return True
    if TX0 - 2 <= x < TX1 and TZ0 <= z < TZ1 and 1 <= y < ROOF + 4: return True
    if 11 <= x < 17 and 0 <= z < PZ0 and 1 <= y < 7: return True
    return False
cleared = 0
for e in site["blocks"]:
    if e["block"] == "minecraft:air": continue
    x, y, z = e["x"] + ox - ORIGIN[0], e["y"] + oy - ORIGIN[1], e["z"] + oz - ORIGIN[2]
    if 0 <= x < DIMS[0] and 0 <= y < DIMS[1] and 0 <= z < DIMS[2] and inside_built(x, y, z) and (x, y, z) not in cells:
        put("survey-clearance", x, y, z, "air"); cleared += 1

# ---------- pane / bar connection states ----------
def connects(x, y, z):
    c = cells.get((x, y, z)); return c is not None and c[0] in CONNECTS
resolved = {}
for (x, y, z), (role, comp) in list(cells.items()):
    if role in PANE:
        props = {"east": connects(x + 1, y, z), "north": connects(x, y, z - 1), "south": connects(x, y, z + 1), "west": connects(x - 1, y, z)}
        state = PANE[role] + "[" + ",".join(f"{k}={str(v).lower()}" for k, v in props.items()) + ",waterlogged=false]"
        key = role + "-" + ("".join(k[0] for k, v in props.items() if v) or "x")
        resolved[key] = state; cells[(x, y, z)] = (key, comp)
palette = dict(P); palette.update(resolved)
used = {r for r, _ in cells.values()}; palette = {k: v for k, v in palette.items() if k in used}

# ---------- emit ----------
by_comp = defaultdict(list)
for (x, y, z), (role, comp) in sorted(cells.items(), key=lambda t: (t[0][1], t[0][2], t[0][0])): by_comp[comp].append((x, y, z, role))
components = []
for comp in comp_order:
    ops, run = [], None
    for (x, y, z, role) in by_comp[comp]:
        if run and run[3] == role and run[1] == y and run[2] == z and run[4] == x: run[4] = x + 1
        else:
            if run: ops.append(run)
            run = [x, y, z, role, x + 1]
    if run: ops.append(run)
    components.append({"id": comp, "role": comp.replace("-", " "), "origin": [0, 0, 0],
                       "operations": [{"op": "box", "min": [r[0], r[1], r[2]], "max": [r[4], r[1] + 1, r[2] + 1], "material": r[3]} for r in ops]})
signs = [{"at": [13, 4, CZ0 - 1], "lines": ["----------", "POINT TOWER", "LOBBY", "----------"]},
         {"at": [14, 4, CZ0 - 1], "lines": ["----------", "LIFT + STAIR", "LEVELS 1-6", "----------"]}]
for s in range(TOWER_STOREYS):
    signs.append({"at": [12, TOWER_BASE + s * STOREY + 3, CZ0], "lines": ["--------", f"LEVEL {s + 1}", "RESIDENCES", "--------"]})
plan = {"schema_version": 1, "plan_id": "north-plot-point-tower", "revision": "r1", "name": "Point Tower · R1",
        "description": "Six residential storeys over a lobby podium on the Praya first plot, within the surveyed 33-block height. Pale quartz piers with recessed black panes to the street, brick blades and privacy panes to the rear, charcoal flanks with timber shades, planted west balconies, an east setback terrace and a screened pale crown. The forecourt keeps the street trees. Review only, no placement.",
        "dimensions": {"x": DIMS[0], "y": DIMS[1], "z": DIMS[2]}, "palette": palette, "components": components, "signs": signs}
print(f"cells={len(cells)} (cleared air {cleared}) components={len(components)} ops={sum(len(c['operations']) for c in components)} palette={len(palette)}", file=sys.stderr)
json.dump(plan, open("/tmp/tower/plan.json", "w"))
if "--dry" in sys.argv: sys.exit(0)
body = json.dumps({"plan": plan, "siteId": SITE, "transform": {"origin": ORIGIN, "turns": 0},
                   "brief": "Point tower study R1 on the Praya first plot (R0 review: rear brick grid replaced by the street pier language with brick blades at the core only; plain parapet; three planted west balconies): six residential storeys over a lobby podium within the 33-block survey cap, recessed street glazing, planted west balconies, east setback, retained forecourt trees. Review only, no placement."}).encode()
req = urllib.request.Request(f"{BASE}/api/workspace/drafts", data=body, method="POST", headers={"Content-Type": "application/json", "X-Builder-Write": "1"})
try: resp = json.load(urllib.request.urlopen(req, timeout=120))
except urllib.error.HTTPError as err: print("HTTP", err.code, err.read().decode()[:2000]); sys.exit(1)
print("draft", resp.get("id"), "valid", resp.get("valid"), "version", resp.get("version"))
print("diagnostics", json.dumps(resp.get("diagnostics"))[:600])
a = resp.get("assessment") or {}
print("assessment errors", json.dumps(a.get("errors"))[:600], "collisions", len(a.get("collisions") or []))
print("access", json.dumps(resp.get("access"))[:1200])
print("candidate blocks", len((resp.get("candidate") or {}).get("blocks", [])))
