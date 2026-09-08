package org.govpraya.builder.plan;

import com.google.gson.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import static org.govpraya.builder.plan.PlanInput.*;

/** Pure, bounded expansion; no server, network or registry calls. */
public final class PlanCompiler {
    private static final Gson GSON = new Gson();
    private final Map<String, String> palette = new TreeMap<>();
    private final Map<Cell, OwnedBlock> cells = new TreeMap<>();
    private final Map<String, JsonObject> components = new TreeMap<>();
    private int[] dimensions;
    private int work;
    private int primitives;

    private record Cell(int x, int y, int z) implements Comparable<Cell> {
        @Override public int compareTo(Cell other) {
            int result = Integer.compare(y, other.y);
            if (result == 0) result = Integer.compare(z, other.z);
            return result == 0 ? Integer.compare(x, other.x) : result;
        }
    }
    private record OwnedBlock(String state, String owner) {}

    public static JsonObject compile(String json) {
        if (json.getBytes(StandardCharsets.UTF_8).length > 1_048_576)
            throw new IllegalArgumentException("Plan exceeds 1 MiB");
        return new PlanCompiler().expand(JsonParser.parseString(json).getAsJsonObject());
    }

    private JsonObject expand(JsonObject root) {
        fields(root, "schema_version", "plan_id", "revision", "name", "description", "dimensions",
                "palette", "components", "spaces", "references");
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
        result.addProperty("hash", hash(result.toString()));
        return result;
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
