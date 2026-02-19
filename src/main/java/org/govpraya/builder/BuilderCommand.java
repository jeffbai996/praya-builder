package org.govpraya.builder;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;

import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;

import org.govpraya.builder.ai.BuildPrompt;
import org.govpraya.builder.ai.GeminiClient;
import org.govpraya.builder.ai.GeminiClient.GeminiException;
import org.govpraya.builder.generation.BlockGrid;
import org.govpraya.builder.generation.SchematicPlacer;

import java.io.File;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class BuilderCommand implements CommandExecutor {

    private static final Component PREFIX =
            Component.text("[PrayaBuilder] ", NamedTextColor.GOLD);

    private final PrayaBuilderPlugin plugin;
    private final Map<UUID, Long> cooldowns = new ConcurrentHashMap<>();

    public BuilderCommand(PrayaBuilderPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage("This command can only be used by players.");
            return true;
        }

        if (args.length < 2 || !args[0].equalsIgnoreCase("generate")) {
            return false;
        }

        // Rate limit check
        int cooldownSecs = plugin.getConfig().getInt("rate-limit.cooldown-seconds", 30);
        long now = System.currentTimeMillis();
        Long lastUse = cooldowns.get(player.getUniqueId());
        if (lastUse != null && (now - lastUse) < cooldownSecs * 1000L) {
            long remaining = (cooldownSecs * 1000L - (now - lastUse)) / 1000;
            sendError(player, "Cooldown: wait " + remaining + "s");
            return true;
        }

        // Parse -save flag and description
        boolean saveMode = false;
        int descStart = 1;
        if (args.length > 2 && args[1].equalsIgnoreCase("-save")) {
            saveMode = true;
            descStart = 2;
        }

        if (descStart >= args.length) {
            sendError(player, "Provide a building description.");
            return true;
        }

        String description = String.join(" ", Arrays.copyOfRange(args, descStart, args.length))
                .replaceAll("^\"|\"$", "");

        GeminiClient gemini = plugin.getGeminiClient();
        if (gemini == null) {
            sendError(player, "Gemini API key not configured.");
            return true;
        }

        // Capture state on main thread before going async
        Location playerLoc = player.getLocation();
        UUID playerId = player.getUniqueId();
        cooldowns.put(playerId, now);

        String systemPrompt = BuildPrompt.buildSystemPrompt(plugin.getConfig());
        boolean finalSaveMode = saveMode;

        sendInfo(player, "Generating: " + description);

        plugin.getServer().getScheduler().runTaskAsynchronously(plugin, () -> {
            try {
                String jsonText = gemini.generate(systemPrompt, description);

                int maxW = plugin.getConfig().getInt("limits.max-width", 48);
                int maxH = plugin.getConfig().getInt("limits.max-height", 64);
                int maxD = plugin.getConfig().getInt("limits.max-depth", 48);
                BlockGrid grid = BlockGrid.parse(jsonText, maxW, maxH, maxD);

                plugin.getServer().getScheduler().runTask(plugin, () -> {
                    Player p = Bukkit.getPlayer(playerId);
                    if (p == null) return;

                    if (finalSaveMode) {
                        handleSave(p, grid);
                    } else {
                        int placed = SchematicPlacer.placeAtLocation(grid, playerLoc);
                        sendSuccess(p, "Placed " + placed + " blocks (" + grid.name() + ")");
                    }
                });

            } catch (GeminiException e) {
                bounceError(playerId, "Gemini error: " + e.getMessage());
                plugin.getLogger().severe("Gemini API error: " + e.getMessage());
            } catch (Exception e) {
                bounceError(playerId, "Unexpected error — check server console.");
                plugin.getLogger().severe("Generation error: " + e.getMessage());
            }
        });

        return true;
    }

    private void handleSave(Player player, BlockGrid grid) {
        try {
            File dir = new File(plugin.getDataFolder(), "schematics");
            String filename = grid.name().replaceAll("[^a-zA-Z0-9_-]", "_") + ".schem";
            File file = new File(dir, filename);
            SchematicPlacer.saveSchematic(grid, file);
            sendSuccess(player, "Saved " + grid.blockCount() + " blocks to " + filename);
        } catch (Exception e) {
            sendError(player, "Failed to save schematic: " + e.getMessage());
            plugin.getLogger().severe("Schematic save error: " + e.getMessage());
        }
    }

    private void bounceError(UUID playerId, String message) {
        plugin.getServer().getScheduler().runTask(plugin, () -> {
            Player p = Bukkit.getPlayer(playerId);
            if (p != null) sendError(p, message);
        });
    }

    private static void sendError(Player player, String message) {
        player.sendMessage(PREFIX.append(Component.text(message, NamedTextColor.RED)));
    }

    private static void sendSuccess(Player player, String message) {
        player.sendMessage(PREFIX.append(Component.text(message, NamedTextColor.GREEN)));
    }

    private static void sendInfo(Player player, String message) {
        player.sendMessage(PREFIX.append(Component.text(message, NamedTextColor.GRAY)));
    }
}
