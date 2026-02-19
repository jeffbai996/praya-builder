package org.govpraya.builder.generation;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class BlockGrid {

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
     * Parses Gemini's JSON response into a validated BlockGrid.
     * Invalid block IDs fall back to minecraft:stone. Blocks outside
     * dimension limits are silently dropped.
     */
    public static BlockGrid parse(String json, int maxWidth, int maxHeight, int maxDepth) {
        JsonObject root = JsonParser.parseString(json).getAsJsonObject();

        String name = root.has("name") ? root.get("name").getAsString() : "Unnamed";

        int dimX = maxWidth;
        int dimY = maxHeight;
        int dimZ = maxDepth;
        if (root.has("dimensions")) {
            JsonObject dims = root.getAsJsonObject("dimensions");
            dimX = Math.min(dims.get("x").getAsInt(), maxWidth);
            dimY = Math.min(dims.get("y").getAsInt(), maxHeight);
            dimZ = Math.min(dims.get("z").getAsInt(), maxDepth);
        }

        JsonArray blocksJson = root.getAsJsonArray("blocks");
        List<Entry> entries = new ArrayList<>();

        for (JsonElement elem : blocksJson) {
            JsonObject block = elem.getAsJsonObject();
            int x = block.get("x").getAsInt();
            int y = block.get("y").getAsInt();
            int z = block.get("z").getAsInt();
            String blockId = block.get("block").getAsString();

            if (x < 0 || x >= maxWidth || y < 0 || y >= maxHeight || z < 0 || z >= maxDepth) {
                continue;
            }

            if (!blockId.startsWith("minecraft:")) {
                blockId = "minecraft:stone";
            }

            entries.add(new Entry(x, y, z, blockId));
        }

        return new BlockGrid(name, dimX, dimY, dimZ, entries);
    }

    public String name() { return name; }
    public int dimX() { return dimX; }
    public int dimY() { return dimY; }
    public int dimZ() { return dimZ; }
    public List<Entry> entries() { return entries; }
    public int blockCount() { return entries.size(); }

    public record Entry(int x, int y, int z, String blockId) {}
}
