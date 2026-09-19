package org.govpraya.builder.plan;

import com.google.gson.*;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import static org.govpraya.builder.plan.PlanInput.*;

/** Pure, bounded expansion; no server, network or registry calls. */
public final class PlanCompiler {
    private static final Gson GSON = new Gson();
    private static final FaceTable CONNECTION_FACES = FaceTable.load();
    private final PartLibrary partLibrary;
    private final Map<String, String> palette = new TreeMap<>();
    private final Map<Cell, OwnedBlock> cells = new TreeMap<>();
    private final Map<String, JsonObject> components = new TreeMap<>();
    private final Map<String, BlockState> parsedStates = new HashMap<>();
    private final JsonArray generatedSigns = new JsonArray();
    private int[] dimensions;
    private int work;
    private int primitives;

    private PlanCompiler(PartLibrary partLibrary) { this.partLibrary = partLibrary; }

    private record Cell(int x, int y, int z) implements Comparable<Cell> {
        @Override public int compareTo(Cell other) {
            int result = Integer.compare(y, other.y);
            if (result == 0) result = Integer.compare(z, other.z);
            return result == 0 ? Integer.compare(x, other.x) : result;
        }

        Cell offset(Direction direction) {
            return new Cell(x + direction.dx, y, z + direction.dz);
        }
    }
    private record OwnedBlock(String state, String owner) {}
    private enum Family { PANE, BARS, WALL, FENCE, STAIRS, OTHER }
    private enum Direction {
        NORTH("north", 0, -1), EAST("east", 1, 0), SOUTH("south", 0, 1), WEST("west", -1, 0);
        final String property;
        final int dx;
        final int dz;
        Direction(String property, int dx, int dz) { this.property = property; this.dx = dx; this.dz = dz; }
        Direction opposite() { return values()[(ordinal() + 2) % 4]; }
        Direction left() { return values()[(ordinal() + 3) % 4]; }
        static Direction facing(String value) {
            for (Direction direction : values()) if (direction.property.equals(value)) return direction;
            return NORTH;
        }
    }
    private record BlockState(String block, Map<String, String> properties) {
        static BlockState parse(String state) {
            int bracket = state.indexOf('[');
            String block = bracket < 0 ? state : state.substring(0, bracket);
            var properties = new TreeMap<String, String>();
            if (bracket >= 0) for (String part : state.substring(bracket + 1, state.length() - 1).split(",")) {
                String[] pair = part.split("=", 2);
                properties.put(pair[0], pair[1]);
            }
            return new BlockState(block, properties);
        }

        String format() {
            if (properties.isEmpty()) return block;
            return block + "[" + String.join(",", new TreeMap<>(properties).entrySet().stream()
                    .map(entry -> entry.getKey() + "=" + entry.getValue()).toList()) + "]";
        }
    }
    private record FaceTable(Map<String, Map<String, String>> defaults, Map<String, String> faces) {
        static FaceTable load() {
            try (InputStream stream = PlanCompiler.class.getResourceAsStream("/block-face-connections-1.21.4.json")) {
                if (stream == null) throw new IllegalStateException("Missing block-face connection table");
                JsonObject root = JsonParser.parseString(new String(stream.readAllBytes(), StandardCharsets.UTF_8)).getAsJsonObject();
                if (integer(root.get("schemaVersion")) != 1 || !"1.21.4".equals(text(root.get("minecraftVersion"))))
                    throw new IllegalStateException("Unsupported block-face connection table");
                var defaults = new HashMap<String, Map<String, String>>();
                for (var entry : root.getAsJsonObject("defaults").entrySet()) {
                    var properties = new TreeMap<String, String>();
                    for (var property : entry.getValue().getAsJsonObject().entrySet())
                        properties.put(property.getKey(), property.getValue().getAsString());
                    defaults.put(entry.getKey(), Map.copyOf(properties));
                }
                var faces = new HashMap<String, String>();
                for (var entry : root.getAsJsonObject("faces").entrySet()) faces.put(entry.getKey(), entry.getValue().getAsString());
                return new FaceTable(Map.copyOf(defaults), Map.copyOf(faces));
            } catch (IOException | RuntimeException error) {
                throw new ExceptionInInitializerError(error);
            }
        }

        boolean knows(String block) { return defaults.containsKey(block); }
        String property(BlockState state, String name) {
            return state.properties.getOrDefault(name, defaults.getOrDefault(state.block, Map.of()).get(name));
        }
        boolean fullFace(BlockState state, Direction direction) {
            Map<String, String> baseline = defaults.get(state.block);
            if (baseline == null) return false;
            var merged = new TreeMap<>(baseline);
            merged.putAll(state.properties);
            String canonical = new BlockState(state.block, merged).format();
            return faces.getOrDefault(canonical, "").contains(direction.property.substring(0, 1));
        }
    }

    public static JsonObject compile(String json) {
        return compile(json, null);
    }

    public static JsonObject compile(String json, Path workspaceParts) {
        if (json.getBytes(StandardCharsets.UTF_8).length > 1_048_576)
            throw new IllegalArgumentException("Plan exceeds 1 MiB");
        return new PlanCompiler(workspaceParts == null ? PartLibrary.bundled() : PartLibrary.load(workspaceParts))
                .expand(JsonParser.parseString(json).getAsJsonObject());
    }

    public static JsonObject parts(Path workspaceParts) {
        return (workspaceParts == null ? PartLibrary.bundled() : PartLibrary.load(workspaceParts)).catalog();
    }

    private JsonObject expand(JsonObject root) {
        fields(root, "schema_version", "plan_id", "revision", "name", "description", "dimensions",
                "palette", "components", "spaces", "references", "signs");
        int schemaVersion = integer(root.get("schema_version"));
        if (schemaVersion != 1 && schemaVersion != 2) throw new IllegalArgumentException("Unsupported schema version");
        JsonObject dims = root.getAsJsonObject("dimensions");
        fields(dims, "x", "y", "z");
        dimensions = new int[]{integer(dims.get("x")), integer(dims.get("y")), integer(dims.get("z"))};
        for (int i = 0; i < 3; i++) {
            if (dimensions[i] < 1 || dimensions[i] > (i == 1 ? 64 : 48))
                throw new IllegalArgumentException("Dimensions exceed limits");
        }
        root.getAsJsonObject("palette").entrySet().forEach(e -> palette.put(id(new JsonPrimitive(e.getKey())), state(e.getValue())));
        if (palette.isEmpty() || palette.size() > 256) throw new IllegalArgumentException("Palette size invalid");
        JsonArray parts = root.getAsJsonArray("components");
        if (parts.isEmpty() || parts.size() > 256) throw new IllegalArgumentException("Component count invalid");
        for (JsonElement element : parts) {
            var component = element.getAsJsonObject();
            fields(component, "id", "role", "origin", "operations");
            String name = id(component.get("id"));
            if (components.containsKey(name)) throw new IllegalArgumentException("Duplicate component: " + name);
            var summary = new JsonObject();
            summary.addProperty("id", name);
            summary.addProperty("role", text(component.get("role")));
            components.put(name, summary);
            var local = new TreeMap<Cell, OwnedBlock>();
            if (schemaVersion == 1) {
                operations(component.getAsJsonArray("operations"), vector(component.get("origin")), name, local, false);
            } else {
                var transform = new Transform(vector(component.get("origin")), 0);
                operationsV2(component.getAsJsonArray("operations"), transform, name, local,
                        Map.of(), 0, new ArrayList<>(), new ArrayDeque<>());
            }
            for (var entry : local.entrySet()) {
                if (cells.putIfAbsent(entry.getKey(), entry.getValue()) != null)
                    throw new IllegalArgumentException("Component overlap at " + entry.getKey());
                if (cells.size() > 10_000) throw new IllegalArgumentException("Final cell limit exceeded");
            }
        }
        if (cells.isEmpty()) throw new IllegalArgumentException("Empty build");
        resolveConnections();
        var spaces = validateSpaces(root.has("spaces") ? root.getAsJsonArray("spaces") : new JsonArray());
        JsonObject result = new JsonObject();
        result.addProperty("schema_version", 1);
        result.addProperty("compiler_version", "1");
        result.addProperty("plan_id", id(root.get("plan_id")));
        result.addProperty("revision", id(root.get("revision")));
        result.addProperty("name", root.has("name") ? text(root.get("name")) : id(root.get("plan_id")));
        result.addProperty("description", root.has("description") ? text(root.get("description")) : "");
        var sortedDims = new JsonObject();
        for (int i = 0; i < 3; i++) sortedDims.addProperty(new String[]{"x", "y", "z"}[i], dimensions[i]);
        result.add("dimensions", sortedDims);
        result.add("components", GSON.toJsonTree(components.values()));
        result.add("spaces", spaces);
        var references = new TreeSet<String>();
        if (root.has("references")) for (var reference : root.getAsJsonArray("references")) references.add(id(reference));
        result.add("references", GSON.toJsonTree(references));
        var blocks = new JsonArray();
        for (var entry : cells.entrySet()) {
            var cell = entry.getKey();
            var block = new JsonObject();
            block.addProperty("x", cell.x); block.addProperty("y", cell.y); block.addProperty("z", cell.z);
            block.addProperty("block", entry.getValue().state);
            block.addProperty("component", entry.getValue().owner);
            blocks.add(block);
        }
        result.add("blocks", blocks);
        if (root.has("signs") || !generatedSigns.isEmpty()) {
            JsonArray signs = new JsonArray();
            if (root.has("signs")) for (JsonElement sign : root.getAsJsonArray("signs")) signs.add(sign.deepCopy());
            for (JsonElement sign : generatedSigns) signs.add(sign.deepCopy());
            if (signs.size() > 128) throw new IllegalArgumentException("Too many signs");
            JsonArray verified = new JsonArray();
            Set<Cell> seenSigns = new HashSet<>();
            for (JsonElement element : signs) {
                JsonObject sign = element.getAsJsonObject(); fields(sign, "at", "lines");
                int[] at = vector(sign.get("at")); Cell cell = new Cell(at[0], at[1], at[2]);
                OwnedBlock placed = cells.get(cell);
                if (placed == null || !placed.state.matches("minecraft:[a-z_]+_wall_sign\\[.*") || !seenSigns.add(cell))
                    throw new IllegalArgumentException("Sign text requires a unique wall sign block");
                JsonArray lines = sign.getAsJsonArray("lines");
                if (lines.size() != 4) throw new IllegalArgumentException("Signs need four lines");
                for (JsonElement line : lines) {
                    if (!line.isJsonPrimitive() || !line.getAsJsonPrimitive().isString()) throw new IllegalArgumentException("Sign lines must be strings");
                    String value = line.getAsString();
                    if (value.length() > 24 || value.chars().anyMatch(Character::isISOControl))
                        throw new IllegalArgumentException("Sign line invalid or too long");
                }
                verified.add(sign.deepCopy());
            }
            result.add("signs", verified);
        }
        result.addProperty("hash", hash(result.toString()));
        return result;
    }

    private BlockState parsed(String state) {
        return parsedStates.computeIfAbsent(state, BlockState::parse);
    }

    private Family family(BlockState state) {
        if (!CONNECTION_FACES.knows(state.block)) return Family.OTHER;
        if (state.block.endsWith("_pane")) return Family.PANE;
        if (state.block.equals("minecraft:iron_bars")) return Family.BARS;
        if (state.block.endsWith("_wall")) return Family.WALL;
        if (state.block.endsWith("_fence")) return Family.FENCE;
        if (state.block.endsWith("_stairs")) return Family.STAIRS;
        return Family.OTHER;
    }

    private void resolveConnections() {
        var resolved = new TreeMap<Cell, OwnedBlock>();
        for (var entry : cells.entrySet()) {
            Cell cell = entry.getKey(); OwnedBlock owned = entry.getValue(); BlockState original = parsed(owned.state);
            Family family = family(original);
            if (family == Family.OTHER) { resolved.put(cell, owned); continue; }
            var properties = new TreeMap<>(original.properties);
            if (family == Family.PANE || family == Family.BARS || family == Family.FENCE || family == Family.WALL) {
                for (Direction direction : Direction.values()) if (!properties.containsKey(direction.property)) {
                    boolean connected = family == Family.FENCE ? connectsFence(cell, direction) : connectsThinOrWall(cell, direction);
                    properties.put(direction.property, family == Family.WALL ? (connected ? "low" : "none") : Boolean.toString(connected));
                }
                if (family == Family.WALL && !properties.containsKey("up")) properties.put("up", "true");
            } else if (!properties.containsKey("shape")) properties.put("shape", stairShape(cell, original));
            String state = new BlockState(original.block, properties).format();
            resolved.put(cell, state.equals(owned.state) ? owned : new OwnedBlock(state, owned.owner));
        }
        cells.clear(); cells.putAll(resolved);
    }

    private boolean connectsThinOrWall(Cell cell, Direction direction) {
        OwnedBlock neighbor = cells.get(cell.offset(direction));
        if (neighbor == null) return false;
        BlockState state = parsed(neighbor.state); Family family = family(state);
        return family == Family.PANE || family == Family.BARS || family == Family.WALL || CONNECTION_FACES.fullFace(state, direction);
    }

    private boolean connectsFence(Cell cell, Direction direction) {
        OwnedBlock neighbor = cells.get(cell.offset(direction));
        if (neighbor == null) return false;
        BlockState state = parsed(neighbor.state);
        return family(state) == Family.FENCE || CONNECTION_FACES.fullFace(state, direction);
    }

    private String stairShape(Cell cell, BlockState own) {
        Direction facing = Direction.facing(CONNECTION_FACES.property(own, "facing"));
        String half = CONNECTION_FACES.property(own, "half");
        BlockState front = stair(cell.offset(facing), half);
        if (front != null) {
            Direction other = Direction.facing(CONNECTION_FACES.property(front, "facing"));
            if (perpendicular(facing, other) && differentStair(cell.offset(other.opposite()), own))
                return other == facing.left() ? "outer_left" : "outer_right";
        }
        BlockState back = stair(cell.offset(facing.opposite()), half);
        if (back != null) {
            Direction other = Direction.facing(CONNECTION_FACES.property(back, "facing"));
            if (perpendicular(facing, other) && differentStair(cell.offset(other), own))
                return other == facing.left() ? "inner_left" : "inner_right";
        }
        return "straight";
    }

    private BlockState stair(Cell cell, String half) {
        OwnedBlock owned = cells.get(cell); if (owned == null) return null;
        BlockState state = parsed(owned.state);
        return family(state) == Family.STAIRS && Objects.equals(half, CONNECTION_FACES.property(state, "half")) ? state : null;
    }

    private boolean differentStair(Cell cell, BlockState own) {
        OwnedBlock owned = cells.get(cell); if (owned == null) return true;
        BlockState state = parsed(owned.state);
        return family(state) != Family.STAIRS
                || !Objects.equals(CONNECTION_FACES.property(state, "facing"), CONNECTION_FACES.property(own, "facing"))
                || !Objects.equals(CONNECTION_FACES.property(state, "half"), CONNECTION_FACES.property(own, "half"));
    }

    private static boolean perpendicular(Direction first, Direction second) {
        return first.dx != 0 ? second.dz != 0 : second.dx != 0;
    }

    private void operations(JsonArray operations, int[] origin, String owner,
                            Map<Cell, OwnedBlock> local, boolean repeated) {
        if (operations.size() > 4096) throw new IllegalArgumentException("Operation limit exceeded");
        for (var element : operations) {
            var op = element.getAsJsonObject();
            String type = text(op.get("op"));
            if (type.equals("repeat")) {
                fields(op, "op", "count", "step", "operations");
                if (repeated) throw new IllegalArgumentException("Nested repeats are unsupported");
                int count = integer(op.get("count"));
                if (count < 1 || count > 4096) throw new IllegalArgumentException("Repeat count outside limits");
                int[] step = vector(op.get("step"));
                for (int n = 0; n < count; n++) {
                    int[] offset = new int[3];
                    for (int i = 0; i < 3; i++) offset[i] = Math.addExact(origin[i], Math.multiplyExact(step[i], n));
                    operations(op.getAsJsonArray("operations"), offset, owner, local, true);
                }
                continue;
            }
            if (++primitives > 4096) throw new IllegalArgumentException("Expanded operation limit exceeded");
            int[] min, max;
            if (type.equals("block")) {
                fields(op, "op", "at", "material"); min = vector(op.get("at")); max = min.clone();
                for (int i = 0; i < 3; i++) max[i] = Math.addExact(max[i], 1);
            } else if (type.equals("box")) {
                fields(op, "op", "min", "max", "material"); min = vector(op.get("min")); max = vector(op.get("max"));
            } else throw new IllegalArgumentException("Unknown operation: " + type);
            String material = palette.get(text(op.get("material")));
            if (material == null) throw new IllegalArgumentException("Unknown palette role");
            for (int i = 0; i < 3; i++) {
                min[i] = Math.addExact(min[i], origin[i]); max[i] = Math.addExact(max[i], origin[i]);
            }
            bounds(min, max);
            long volume = (long) (max[0] - min[0]) * (max[1] - min[1]) * (max[2] - min[2]);
            if (volume + work > 100_000) throw new IllegalArgumentException("Expansion work limit exceeded");
            work += (int) volume;
            for (int y = min[1]; y < max[1]; y++) for (int z = min[2]; z < max[2]; z++) for (int x = min[0]; x < max[0]; x++) {
                local.put(new Cell(x, y, z), new OwnedBlock(material, owner));
                if (local.size() > 10_000) throw new IllegalArgumentException("Component cell limit exceeded");
            }
        }
    }

    private record Transform(int[] offset, int turns) {
        Transform {
            offset = offset.clone();
            turns = Math.floorMod(turns, 4);
        }
        Cell apply(int x, int y, int z) {
            int rx = x, rz = z;
            for (int n = 0; n < turns; n++) { int next = -rz; rz = rx; rx = next; }
            return new Cell(Math.addExact(offset[0], rx), Math.addExact(offset[1], y), Math.addExact(offset[2], rz));
        }
        int[] inverse(Cell cell) {
            int x = Math.subtractExact(cell.x, offset[0]);
            int y = Math.subtractExact(cell.y, offset[1]);
            int z = Math.subtractExact(cell.z, offset[2]);
            for (int n = 0; n < turns; n++) { int next = z; z = -x; x = next; }
            return new int[]{x, y, z};
        }
        Transform nested(int[] at, int additionalTurns) {
            Cell translated = apply(at[0], at[1], at[2]);
            return new Transform(new int[]{translated.x, translated.y, translated.z}, turns + additionalTurns);
        }
    }

    private record BoundFrame(int[] min, int[] max, Transform transform) {
        BoundFrame { min = min.clone(); max = max.clone(); }
        boolean contains(Cell world) {
            int[] local = transform.inverse(world);
            for (int i = 0; i < 3; i++) if (local[i] < min[i] || local[i] >= max[i]) return false;
            return true;
        }
    }

    private void operationsV2(JsonArray operations, Transform transform, String owner,
                              Map<Cell, OwnedBlock> local, Map<String, Object> params,
                              int repeatDepth, List<BoundFrame> frames, Deque<String> callStack) {
        if (operations.size() > 4096) throw new IllegalArgumentException("Operation limit exceeded");
        for (JsonElement element : operations) {
            JsonObject op = element.getAsJsonObject(); String type = text(op.get("op"));
            if (!enabled(op, params)) continue;
            if (type.equals("repeat")) {
                fields(op, "op", "count", "step", "operations", "when");
                if (repeatDepth >= 3) throw new IllegalArgumentException("Repeat nesting depth exceeded");
                int count = scalar(op.get("count"), params);
                if (count < 1 || count > 4096) throw new IllegalArgumentException("Repeat count outside limits");
                int[] step = templateVector(op.get("step"), params);
                for (int n = 0; n < count; n++) {
                    int[] at = new int[3];
                    for (int i = 0; i < 3; i++) at[i] = Math.multiplyExact(step[i], n);
                    operationsV2(op.getAsJsonArray("operations"), transform.nested(at, 0), owner, local,
                            params, repeatDepth + 1, frames, callStack);
                }
                continue;
            }
            if (type.equals("call")) {
                call(op, transform, owner, local, params, repeatDepth, frames, callStack);
                continue;
            }
            if (++primitives > 4096) throw new IllegalArgumentException("Expanded operation limit exceeded");
            int[] min, max;
            if (type.equals("block")) {
                fields(op, "op", "at", "material", "when"); min = templateVector(op.get("at"), params); max = min.clone();
                for (int i = 0; i < 3; i++) max[i] = Math.addExact(max[i], 1);
            } else if (type.equals("box") || type.equals("fill")) {
                fields(op, "op", "min", "max", "material", "interior", "when");
                if (type.equals("box") && op.has("interior")) throw new IllegalArgumentException("Box cannot have interior material");
                if (type.equals("fill") && !op.has("interior")) throw new IllegalArgumentException("Fill requires interior material");
                min = templateVector(op.get("min"), params); max = templateVector(op.get("max"), params);
            } else throw new IllegalArgumentException("Unknown operation: " + type);
            for (int i = 0; i < 3; i++) if (max[i] <= min[i]) throw new IllegalArgumentException("Operation has empty local bounds");
            long volume = (long) (max[0] - min[0]) * (max[1] - min[1]) * (max[2] - min[2]);
            if (volume + work > 100_000) throw new IllegalArgumentException("Expansion work limit exceeded");
            work += (int) volume;
            String shell = material(op.get("material"), params);
            String inside = type.equals("fill") ? material(op.get("interior"), params) : shell;
            for (int y = min[1]; y < max[1]; y++) for (int z = min[2]; z < max[2]; z++) for (int x = min[0]; x < max[0]; x++) {
                boolean boundary = x == min[0] || x == max[0] - 1 || y == min[1] || y == max[1] - 1 || z == min[2] || z == max[2] - 1;
                emit(transform.apply(x, y, z), type.equals("fill") && !boundary ? inside : shell,
                        transform.turns, owner, local, frames);
            }
        }
    }

    private void call(JsonObject op, Transform parent, String owner, Map<Cell, OwnedBlock> local,
                      Map<String, Object> parentParams, int repeatDepth, List<BoundFrame> frames,
                      Deque<String> callStack) {
        fields(op, "op", "part", "at", "params", "signs", "when");
        String partName = PartLibrary.partId(op.get("part"));
        if (callStack.contains(partName) || callStack.size() >= 16) throw new IllegalArgumentException("Part call cycle or depth exceeded: " + partName);
        JsonObject part = partLibrary.get(partName);
        Map<String, Object> params = parameters(part.getAsJsonObject("parameters"),
                op.has("params") ? op.getAsJsonObject("params") : new JsonObject(), parentParams);
        int turns = rotation(part, params);
        Transform transform = parent.nested(templateVector(op.get("at"), parentParams), turns);
        JsonObject bounds = part.getAsJsonObject("bounds");
        int[] min = templateVector(bounds.get("min"), params), max = templateVector(bounds.get("max"), params);
        for (int i = 0; i < 3; i++) if (max[i] <= min[i]) throw new IllegalArgumentException("Part bounds are empty: " + partName);
        var nestedFrames = new ArrayList<>(frames); nestedFrames.add(new BoundFrame(min, max, transform));
        callStack.addLast(partName);
        try {
            for (JsonElement element : part.getAsJsonArray("components")) {
                JsonObject component = element.getAsJsonObject();
                fields(component, "id", "role", "origin", "operations", "when");
                if (!enabled(component, params)) continue;
                id(component.get("id")); text(component.get("role"));
                Transform componentTransform = transform.nested(templateVector(component.get("origin"), params), 0);
                operationsV2(component.getAsJsonArray("operations"), componentTransform, owner, local,
                        params, repeatDepth, nestedFrames, callStack);
            }
            attachSigns(part, op.has("signs") ? op.getAsJsonObject("signs") : new JsonObject(),
                    params, transform);
        } finally { callStack.removeLast(); }
    }

    private Map<String, Object> parameters(JsonObject definitions, JsonObject supplied, Map<String, Object> parent) {
        for (String key : supplied.keySet()) if (!definitions.has(key)) throw new IllegalArgumentException("Unknown part parameter: " + key);
        var values = new TreeMap<String, Object>();
        for (var entry : definitions.entrySet()) {
            String name = id(new JsonPrimitive(entry.getKey())); JsonObject definition = entry.getValue().getAsJsonObject();
            JsonElement input = supplied.has(name) ? supplied.get(name) : definition.get("default");
            if (input == null) throw new IllegalArgumentException("Missing part parameter: " + name);
            String type = text(definition.get("type")); Object value;
            if (type.equals("integer")) {
                value = scalar(input, parent); int integer = (Integer) value;
                if (integer < integer(definition.get("min")) || integer > integer(definition.get("max")))
                    throw new IllegalArgumentException("Part parameter outside bounds: " + name);
            } else {
                value = token(input, parent);
                if (type.equals("enum")) {
                    boolean found = false;
                    for (JsonElement allowed : definition.getAsJsonArray("values")) if (text(allowed).equals(value)) found = true;
                    if (!found) throw new IllegalArgumentException("Invalid enum parameter: " + name);
                } else if (!type.equals("material")) throw new IllegalArgumentException("Unknown parameter type: " + type);
            }
            values.put(name, value);
        }
        return Map.copyOf(values);
    }

    private static int rotation(JsonObject part, Map<String, Object> params) {
        if (!part.has("rotation")) return 0;
        JsonObject rotation = part.getAsJsonObject("rotation"); fields(rotation, "param", "turns");
        String param = id(rotation.get("param")); Object selected = params.get(param);
        if (!(selected instanceof String)) throw new IllegalArgumentException("Rotation parameter must be enum");
        JsonObject turns = rotation.getAsJsonObject("turns");
        if (!turns.has((String) selected)) throw new IllegalArgumentException("Rotation mapping missing value");
        int value = integer(turns.get((String) selected));
        if (value < 0 || value > 3) throw new IllegalArgumentException("Rotation turns outside range");
        return value;
    }

    private void attachSigns(JsonObject part, JsonObject supplied, Map<String, Object> params, Transform transform) {
        var slots = new TreeMap<String, JsonObject>();
        if (part.has("signs")) for (JsonElement element : part.getAsJsonArray("signs")) {
            JsonObject slot = element.getAsJsonObject(); fields(slot, "id", "at", "required", "lines", "when");
            String name = id(slot.get("id")); if (slots.put(name, slot) != null) throw new IllegalArgumentException("Duplicate sign slot: " + name);
        }
        for (String key : supplied.keySet()) if (!slots.containsKey(key)) throw new IllegalArgumentException("Unknown sign slot: " + key);
        for (var entry : slots.entrySet()) {
            JsonObject slot = entry.getValue(); if (!enabled(slot, params)) continue;
            JsonElement lines = supplied.has(entry.getKey()) ? supplied.get(entry.getKey()) : slot.get("lines");
            boolean required = slot.has("required") && slot.get("required").getAsBoolean();
            if (lines == null) { if (required) throw new IllegalArgumentException("Required sign slot missing: " + entry.getKey()); continue; }
            if (!lines.isJsonArray()) throw new IllegalArgumentException("Sign slot lines must be array");
            int[] at = templateVector(slot.get("at"), params); Cell world = transform.apply(at[0], at[1], at[2]);
            JsonObject sign = new JsonObject(); sign.add("at", GSON.toJsonTree(new int[]{world.x, world.y, world.z})); sign.add("lines", lines.deepCopy());
            generatedSigns.add(sign);
        }
    }

    private void emit(Cell cell, String materialRole, int turns, String owner, Map<Cell, OwnedBlock> local,
                      List<BoundFrame> frames) {
        if (cell.x < 0 || cell.y < 0 || cell.z < 0 || cell.x >= dimensions[0] || cell.y >= dimensions[1] || cell.z >= dimensions[2])
            throw new IllegalArgumentException("Operation outside declared bounds");
        for (BoundFrame frame : frames) if (!frame.contains(cell)) throw new IllegalArgumentException("Part operation outside declared bounds");
        String material = palette.get(materialRole);
        if (material == null) throw new IllegalArgumentException("Unknown palette role: " + materialRole);
        local.put(cell, new OwnedBlock(rotateState(material, turns), owner));
        if (local.size() > 10_000) throw new IllegalArgumentException("Component cell limit exceeded");
    }

    private String rotateState(String state, int turns) {
        if (turns == 0) return state;
        BlockState parsed = parsed(state); var rotated = new TreeMap<String, String>();
        for (var entry : parsed.properties.entrySet()) {
            String key = entry.getKey(), value = entry.getValue();
            Direction keyDirection = direction(key), valueDirection = direction(value);
            if (keyDirection != null) key = rotate(keyDirection, turns).property;
            if (entry.getKey().equals("facing") && valueDirection != null) value = rotate(valueDirection, turns).property;
            if (entry.getKey().equals("axis") && turns % 2 == 1) {
                if (value.equals("x")) value = "z"; else if (value.equals("z")) value = "x";
            }
            if (entry.getKey().equals("rotation")) {
                try { value = Integer.toString(Math.floorMod(Integer.parseInt(value) + turns * 4, 16)); }
                catch (NumberFormatException ignored) { /* Registry validation owns invalid state values. */ }
            }
            rotated.put(key, value);
        }
        return new BlockState(parsed.block, rotated).format();
    }

    private static Direction direction(String value) {
        for (Direction direction : Direction.values()) if (direction.property.equals(value)) return direction;
        return null;
    }

    private static Direction rotate(Direction direction, int turns) {
        return Direction.values()[Math.floorMod(direction.ordinal() + turns, 4)];
    }

    private String material(JsonElement value, Map<String, Object> params) {
        return token(value, params);
    }

    private static String token(JsonElement value, Map<String, Object> params) {
        if (value != null && value.isJsonPrimitive() && value.getAsJsonPrimitive().isString()) return id(value);
        if (value == null || !value.isJsonObject()) throw new IllegalArgumentException("Expected token or parameter reference");
        JsonObject reference = value.getAsJsonObject(); fields(reference, "param");
        Object resolved = params.get(id(reference.get("param")));
        if (!(resolved instanceof String)) throw new IllegalArgumentException("Parameter is not a token");
        return (String) resolved;
    }

    private static int scalar(JsonElement value, Map<String, Object> params) {
        if (value != null && value.isJsonPrimitive() && value.getAsJsonPrimitive().isNumber()) return integer(value);
        if (value == null || !value.isJsonObject()) throw new IllegalArgumentException("Expected integer or scalar template");
        JsonObject template = value.getAsJsonObject(); fields(template, "param", "scale", "offset");
        Object resolved = params.get(id(template.get("param")));
        if (!(resolved instanceof Integer)) throw new IllegalArgumentException("Scalar parameter is not integer");
        int scale = template.has("scale") ? integer(template.get("scale")) : 1;
        int offset = template.has("offset") ? integer(template.get("offset")) : 0;
        return Math.addExact(Math.multiplyExact((Integer) resolved, scale), offset);
    }

    private static int[] templateVector(JsonElement value, Map<String, Object> params) {
        if (value == null || !value.isJsonArray() || value.getAsJsonArray().size() != 3)
            throw new IllegalArgumentException("Expected three coordinates");
        JsonArray array = value.getAsJsonArray();
        return new int[]{scalar(array.get(0), params), scalar(array.get(1), params), scalar(array.get(2), params)};
    }

    private static boolean enabled(JsonObject object, Map<String, Object> params) {
        if (!object.has("when")) return true;
        JsonObject when = object.getAsJsonObject("when"); fields(when, "param", "equals");
        Object actual = params.get(id(when.get("param")));
        if (actual == null) throw new IllegalArgumentException("Unknown condition parameter");
        JsonElement expected = when.get("equals");
        return actual instanceof Integer ? ((Integer) actual) == integer(expected) : actual.equals(text(expected));
    }

    private JsonArray validateSpaces(JsonArray spaces) {
        if (spaces.size() > 256) throw new IllegalArgumentException("Too many spaces");
        var normalized = new TreeMap<String, JsonObject>();
        for (var element : spaces) {
            var space = element.getAsJsonObject(); fields(space, "id", "min", "max");
            String name = id(space.get("id"));
            int[] min = vector(space.get("min")), max = vector(space.get("max")); bounds(min, max);
            if (normalized.containsKey(name)) throw new IllegalArgumentException("Duplicate space: " + name);
            for (var entry : cells.entrySet()) {
                var p = entry.getKey();
                if (p.x >= min[0] && p.x < max[0] && p.y >= min[1] && p.y < max[1] && p.z >= min[2] && p.z < max[2]
                        && !entry.getValue().state.equals("minecraft:air"))
                    throw new IllegalArgumentException("Clearance blocked: " + name + " at " + p);
            }
            var clean = new JsonObject(); clean.addProperty("id", name);
            clean.add("min", GSON.toJsonTree(min)); clean.add("max", GSON.toJsonTree(max)); normalized.put(name, clean);
        }
        return GSON.toJsonTree(normalized.values()).getAsJsonArray();
    }

    private void bounds(int[] min, int[] max) {
        for (int i = 0; i < 3; i++) if (min[i] < 0 || max[i] <= min[i] || max[i] > dimensions[i])
            throw new IllegalArgumentException("Operation outside declared bounds");
    }

    private static String hash(String text) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
