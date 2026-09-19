package org.govpraya.builder.plan;

import com.google.gson.*;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import static org.govpraya.builder.plan.PlanInput.*;

/** Pure, bounded expansion; no server, network or registry calls. */
public final class PlanCompiler {
    private static final Gson GSON = new Gson();
    private static final FaceTable CONNECTION_FACES = FaceTable.load();
    private final Map<String, String> palette = new TreeMap<>();
    private final Map<Cell, OwnedBlock> cells = new TreeMap<>();
    private final Map<String, JsonObject> components = new TreeMap<>();
    private final Map<String, BlockState> parsedStates = new HashMap<>();
    private int[] dimensions;
    private int work;
    private int primitives;

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
        if (json.getBytes(StandardCharsets.UTF_8).length > 1_048_576)
            throw new IllegalArgumentException("Plan exceeds 1 MiB");
        return new PlanCompiler().expand(JsonParser.parseString(json).getAsJsonObject());
    }

    private JsonObject expand(JsonObject root) {
        fields(root, "schema_version", "plan_id", "revision", "name", "description", "dimensions",
                "palette", "components", "spaces", "references", "signs");
        if (integer(root.get("schema_version")) != 1) throw new IllegalArgumentException("Unsupported schema version");
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
            operations(component.getAsJsonArray("operations"), vector(component.get("origin")), name, local, false);
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
        if (root.has("signs")) {
            JsonArray signs = root.getAsJsonArray("signs");
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
