package org.govpraya.builder.ai;

import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.FileConfiguration;

import java.util.ArrayList;
import java.util.List;

public class BuildPrompt {

    private static final String SYSTEM_TEMPLATE = """
            You are a Minecraft building generator. You output ONLY valid JSON — no markdown, \
            no explanation, no commentary.

            Given a building description, generate a 3D block grid as a JSON object with this exact schema:

            {
              "name": "string — short building name",
              "dimensions": { "x": int, "y": int, "z": int },
              "blocks": [
                { "x": int, "y": int, "z": int, "block": "minecraft:block_id" }
              ]
            }

            CONSTRAINTS:
            - Y is vertical (up). Ground level is y=0.
            - Only use blocks from this palette: %s
            - Maximum dimensions: %dx%dx%d blocks (width x height x depth)
            - Omit air blocks — only include solid blocks
            - Use minecraft: namespaced block IDs (e.g., "minecraft:white_concrete")
            - Buildings should be structurally plausible (walls, floors, roof, windows)
            - Interior floors should have open space (rooms, not solid fill)
            - Ground floor should be slightly larger or differentiated (lobby, entrance)

            OUTPUT ONLY THE JSON OBJECT. No other text.""";

    public static String buildSystemPrompt(FileConfiguration config) {
        List<String> allBlocks = new ArrayList<>();
        ConfigurationSection palette = config.getConfigurationSection("palette");
        if (palette != null) {
            for (String category : palette.getKeys(false)) {
                allBlocks.addAll(palette.getStringList(category));
            }
        }

        String paletteStr = allBlocks.isEmpty()
                ? "any standard Minecraft blocks"
                : String.join(", ", allBlocks);

        int maxWidth = config.getInt("limits.max-width", 48);
        int maxHeight = config.getInt("limits.max-height", 64);
        int maxDepth = config.getInt("limits.max-depth", 48);

        return SYSTEM_TEMPLATE.formatted(paletteStr, maxWidth, maxHeight, maxDepth);
    }
}
