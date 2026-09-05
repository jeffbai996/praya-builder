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
import org.govpraya.builder.ai.BlockGenerator;
import org.govpraya.builder.ai.GenerationException;
import org.govpraya.builder.generation.BlockGrid;
import org.govpraya.builder.generation.SchematicPlacer;

import java.io.File;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Set;
import java.util.HashSet;
import java.util.logging.Level;

public class BuilderCommand implements CommandExecutor {

    private static final Component PREFIX =
            Component.text("[PrayaBuilder] ", NamedTextColor.GOLD);

    private final PrayaBuilderPlugin plugin;
    private final Map<UUID, Long> cooldowns = new ConcurrentHashMap<>();
    private final Set<UUID> pending = new HashSet<>();

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

        if (pending.contains(player.getUniqueId())) {
            sendError(player, "A build is already being generated for you.");
            return true;
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
        if (args[1].equalsIgnoreCase("-save")) {
            saveMode = true;
            descStart = 2;
        }

        if (descStart >= args.length) {
            sendError(player, "Provide a building description.");
            return true;
        }

        String description = String.join(" ", Arrays.copyOfRange(args, descStart, args.length))
                .replaceAll("^\"|\"$", "");
        if (description.isBlank()) {
            sendError(player, "Provide a building description.");
            return true;
        }

        BlockGenerator generator = plugin.getGenerator();
        if (generator == null) {
            sendError(player, "Gemini API key not configured.");
            return true;
        }

        // Capture state on main thread before going async
        Location playerLoc = player.getLocation();
        UUID playerId = player.getUniqueId();
        cooldowns.put(playerId, now);

        String systemPrompt = BuildPrompt.buildSystemPrompt(plugin.getConfig());
        int maxW = plugin.getConfig().getInt("limits.max-width", 48);
        int maxH = plugin.getConfig().getInt("limits.max-height", 64);
        int maxD = plugin.getConfig().getInt("limits.max-depth", 48);
        int maxBlocks = plugin.getConfig().getInt("limits.max-blocks", BlockGrid.DEFAULT_MAX_BLOCKS);
        boolean finalSaveMode = saveMode;
        pending.add(playerId);

        sendInfo(player, "Generating: " + description);

        plugin.getServer().getScheduler().runTaskAsynchronously(plugin, () -> {
            try {
                String jsonText = generator.generate(systemPrompt, description);
                BlockGrid grid = BlockGrid.parse(jsonText, maxW, maxH, maxD, maxBlocks);

                plugin.getServer().getScheduler().runTask(plugin, () -> {
                    pending.remove(playerId);
                    Player p = Bukkit.getPlayer(playerId);
                    if (p == null) return;

                    try {
                        if (finalSaveMode) {
                            handleSave(p, grid);
                        } else {
                            int placed = SchematicPlacer.placeAtLocation(grid, playerLoc, p);
                            sendSuccess(p, "Changed " + placed + " blocks (" + grid.name() + "). Use //undo to revert.");
                        }
                    } catch (Exception e) {
                        sendError(p, "Build could not be placed. If changes occurred, use //undo. Check server console.");
                        plugin.getLogger().log(Level.SEVERE, "Placement failed", e);
                    }
                });

            } catch (GenerationException e) {
                bounceError(playerId, "Generation error: " + e.getMessage());
                plugin.getLogger().warning("Generation failed: " + e.getMessage());
            } catch (IllegalArgumentException e) {
                bounceError(playerId, "Invalid build: " + e.getMessage());
            } catch (Exception e) {
                bounceError(playerId, "Unexpected error — check server console.");
                plugin.getLogger().log(Level.SEVERE, "Generation failed", e);
            }
        });

        return true;
    }

    private void handleSave(Player player, BlockGrid grid) {
        try {
            File dir = new File(plugin.getDataFolder(), "schematics");
            String name = grid.name().replaceAll("[^a-zA-Z0-9_-]", "_");
            if (name.isBlank()) name = "building";
            String filename = name.substring(0, Math.min(name.length(), 80)) + ".schem";
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
            pending.remove(playerId);
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
