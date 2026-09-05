package org.govpraya.builder.generation;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

public class BlockGrid {

    public static final int DEFAULT_MAX_BLOCKS = 10_000;
    private static final Pattern BLOCK_STATE = Pattern.compile(
            "minecraft:[a-z0-9_]+(?:\\[[a-z0-9_]+=[a-z0-9_]+(?:,[a-z0-9_]+=[a-z0-9_]+)*\\])?");

    private final String name;
    private final int dimX;
    private final int dimY;
    private final int dimZ;
    private final List<Entry> entries;

    private BlockGrid(String name, int dimX, int dimY, int dimZ, List<Entry> entries) {
        this.name = name;
        this.dimX = dimX;
        this.dimY = dimY;
        this.dimZ = dimZ;
        this.entries = Collections.unmodifiableList(entries);
    }

    /**
     * Preserves valid legacy grids, but rejects malformed builds as a whole.
     * Registry/state validation happens in the placer before any world mutation.
     */
    public static BlockGrid parse(String json, int maxWidth, int maxHeight, int maxDepth) {
        return parse(json, maxWidth, maxHeight, maxDepth, DEFAULT_MAX_BLOCKS);
    }

    public static BlockGrid parse(String json, int maxWidth, int maxHeight, int maxDepth, int maxBlocks) {
        if (maxWidth <= 0 || maxHeight <= 0 || maxDepth <= 0 || maxBlocks <= 0) {
            throw new IllegalArgumentException("Build limits must be positive.");
        }
        JsonObject root = JsonParser.parseString(json).getAsJsonObject();

        String name = root.has("name") ? root.get("name").getAsString() : "Unnamed";

        int dimX = maxWidth;
        int dimY = maxHeight;
        int dimZ = maxDepth;
        if (root.has("dimensions")) {
            JsonObject dims = root.getAsJsonObject("dimensions");
            dimX = boundedDimension(dims, "x", maxWidth);
            dimY = boundedDimension(dims, "y", maxHeight);
            dimZ = boundedDimension(dims, "z", maxDepth);
        }

        JsonArray blocksJson = root.getAsJsonArray("blocks");
        if (blocksJson == null || blocksJson.isEmpty() || blocksJson.size() > maxBlocks) {
            throw new IllegalArgumentException("Build must contain between 1 and " + maxBlocks + " blocks.");
        }
        List<Entry> entries = new ArrayList<>();
        Set<Position> occupied = new HashSet<>();

        for (JsonElement elem : blocksJson) {
            JsonObject block = elem.getAsJsonObject();
            int x = integer(block, "x");
            int y = integer(block, "y");
            int z = integer(block, "z");
            String blockId = block.get("block").getAsString();

            if (x < 0 || x >= dimX || y < 0 || y >= dimY || z < 0 || z >= dimZ) {
                throw new IllegalArgumentException("Block outside declared dimensions: " + x + "," + y + "," + z);
            }

            if (!BLOCK_STATE.matcher(blockId).matches()) {
                throw new IllegalArgumentException("Malformed block state: " + blockId);
            }
            if (!occupied.add(new Position(x, y, z))) {
                throw new IllegalArgumentException("Duplicate block position: " + x + "," + y + "," + z);
            }

            entries.add(new Entry(x, y, z, blockId));
        }

        return new BlockGrid(name, dimX, dimY, dimZ, entries);
    }

    private static int boundedDimension(JsonObject dims, String key, int limit) {
        int value = integer(dims, key);
        if (value <= 0 || value > limit) {
            throw new IllegalArgumentException("Dimension " + key + " must be between 1 and " + limit);
        }
        return value;
    }

    private static int integer(JsonObject object, String key) {
        JsonElement value = object.get(key);
        if (value == null || !value.isJsonPrimitive() || !value.getAsJsonPrimitive().isNumber()) {
            throw new IllegalArgumentException(key + " must be an integer number.");
        }
        try {
            return value.getAsBigDecimal().intValueExact();
        } catch (ArithmeticException | NumberFormatException e) {
            throw new IllegalArgumentException(key + " must be an integer in range.", e);
        }
    }

    private record Position(int x, int y, int z) {}

    public String name() { return name; }
    public int dimX() { return dimX; }
    public int dimY() { return dimY; }
    public int dimZ() { return dimZ; }
    public List<Entry> entries() { return entries; }
    public int blockCount() { return entries.size(); }

    public record Entry(int x, int y, int z, String blockId) {}
}
