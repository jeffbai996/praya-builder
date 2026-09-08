package org.govpraya.builder.smoke;

import com.sk89q.worldedit.extent.clipboard.io.BuiltInClipboardFormat;
import com.sk89q.worldedit.math.BlockVector3;
import org.bukkit.plugin.java.JavaPlugin;
import org.govpraya.builder.generation.BlockGrid;
import org.govpraya.builder.generation.SchematicPlacer;

import java.nio.file.Files;
import java.nio.file.FileAlreadyExistsException;
import java.util.Arrays;
import java.util.logging.Level;
import org.bukkit.Bukkit;
import com.sk89q.worldedit.bukkit.BukkitAdapter;

/** Opt-in isolated-server probe; never include this jar in a normal deployment. */
public final class BuilderSmokeTests extends JavaPlugin {
    @Override
    public void onEnable() {
        if (!"1".equals(System.getenv("BUILDER_SMOKE_TEST"))) {
            getLogger().warning("Smoke tests disabled; set BUILDER_SMOKE_TEST=1 only on an isolated server.");
            getServer().getPluginManager().disablePlugin(this);
            return;
        }
        getServer().getScheduler().runTask(this, () -> {
            try {
                runChecks();
                getLogger().info("BUILDER_SMOKE_PASS");
            } catch (Exception | AssertionError e) {
                getLogger().log(Level.SEVERE, "BUILDER_SMOKE_FAIL", e);
            } finally {
                getServer().shutdown();
            }
        });
    }

    private void runChecks() throws Exception {
        var directory = Files.createTempDirectory(getDataFolder().toPath().toAbsolutePath().getParent(),
                "builder-smoke-");
        var path = directory.resolve("example.schem");
        String state = "minecraft:oak_stairs[facing=east,half=top,shape=straight,waterlogged=false]";
        SchematicPlacer.saveSchematic(grid(state), path.toFile());
        byte[] original = Files.readAllBytes(path);
        try (var reader = BuiltInClipboardFormat.SPONGE_V3_SCHEMATIC.getReader(Files.newInputStream(path))) {
            var clipboard = reader.read();
            String actual = clipboard.getBlock(BlockVector3.ZERO).getAsString();
            check(actual.contains("facing=east") && actual.contains("half=top"),
                    "Stair orientation did not round-trip: " + actual);
            check(clipboard.getDimensions().equals(BlockVector3.at(1, 1, 1)), "Wrong dimensions");
        }
        try {
            SchematicPlacer.saveSchematic(grid("minecraft:stone"), path.toFile());
            throw new AssertionError("Existing schematic was overwritten");
        } catch (FileAlreadyExistsException expected) {
            check(Arrays.equals(original, Files.readAllBytes(path)), "Existing file changed");
        }
        for (String invalid : new String[]{"minecraft:no_such_block", "minecraft:oak_stairs[facing=up]"}) {
            var invalidPath = directory.resolve("invalid.schem");
            try {
                SchematicPlacer.saveSchematic(grid(invalid), invalidPath.toFile());
                throw new AssertionError("Invalid state accepted: " + invalid);
            } catch (IllegalArgumentException expected) {
                check(!Files.exists(invalidPath), "Invalid build left a schematic");
            }
        }
        String preview = System.getenv("BUILDER_PREVIEW_FILE");
        if (preview != null && !preview.isBlank()) {
            var input = java.nio.file.Path.of(preview);
            check(Files.size(input) <= 4 * 1024 * 1024, "Preview artifact too large");
            String json = Files.readString(input);
            var apartment = BlockGrid.parse(json, 48, 64, 48);
            var export = directory.resolve("apartment.schem");
            SchematicPlacer.saveSchematic(apartment, export.toFile());
            try (var reader = BuiltInClipboardFormat.SPONGE_V3_SCHEMATIC.getReader(Files.newInputStream(export))) {
                var clipboard = reader.read();
                check(clipboard.getDimensions().equals(BlockVector3.at(apartment.dimX(), apartment.dimY(), apartment.dimZ())),
                        "Apartment dimensions differ from the preview");
                for (var entry : apartment.entries()) {
                    String expected = BukkitAdapter.adapt(Bukkit.createBlockData(entry.blockId())).getAsString();
                    String actual = clipboard.getBlock(BlockVector3.at(entry.x(), entry.y(), entry.z())).getAsString();
                    check(expected.equals(actual), "Apartment block changed during export: " + entry);
                }
            }
            Files.writeString(directory.resolve("apartment.artifact.json"), json,
                    java.nio.file.StandardOpenOption.CREATE_NEW);
            getLogger().info("APARTMENT_ROUNDTRIP_PASS cells=" + apartment.blockCount() + " artifact=" + directory);
        }
        String browserExports = System.getenv("BUILDER_SCHEMATIC_DIR");
        if (browserExports != null && !browserExports.isBlank()) {
            checkBrowserExports(java.nio.file.Path.of(browserExports));
        }
    }

    /** Read the browser's bytes directly: re-exporting through Java would mask codec errors. */
    private void checkBrowserExports(java.nio.file.Path directory) throws Exception {
        int count = 0;
        try (var files = Files.list(directory)) {
            for (var file : files.filter(p -> p.toString().endsWith(".schem")).sorted().toList()) {
                var source = file.resolveSibling(file.getFileName().toString().replace(".schem", ".json"));
                var expected = BlockGrid.parse(Files.readString(source), 48, 64, 48);
                var states = new java.util.HashMap<BlockVector3, String>();
                for (var entry : expected.entries()) {
                    states.put(BlockVector3.at(entry.x(), entry.y(), entry.z()),
                            BukkitAdapter.adapt(Bukkit.createBlockData(entry.blockId())).getAsString());
                }
                try (var reader = BuiltInClipboardFormat.SPONGE_V3_SCHEMATIC.getReader(Files.newInputStream(file))) {
                    var clipboard = reader.read();
                    check(clipboard.getDimensions().equals(BlockVector3.at(expected.dimX(), expected.dimY(), expected.dimZ())),
                            "Browser export dimensions changed: " + file);
                    check(clipboard.getOrigin().equals(BlockVector3.ZERO), "Browser export origin changed");
                    for (int y = 0; y < expected.dimY(); y++) {
                        for (int z = 0; z < expected.dimZ(); z++) {
                            for (int x = 0; x < expected.dimX(); x++) {
                                var pos = BlockVector3.at(x, y, z);
                                check(states.getOrDefault(pos, "minecraft:air").equals(clipboard.getBlock(pos).getAsString()),
                                        "Browser export state changed: " + file + " at " + pos);
                            }
                        }
                    }
                }
                count++;
                getLogger().info("BROWSER_SCHEMATIC_PASS " + file.getFileName());
            }
        }
        check(count > 0, "No browser schematics tested");
        getLogger().info("BROWSER_SCHEMATICS_PASS count=" + count);
    }

    private static BlockGrid grid(String state) {
        return BlockGrid.parse("""
                {"dimensions":{"x":1,"y":1,"z":1},
                 "blocks":[{"x":0,"y":0,"z":0,"block":"%s"}]}
                """.formatted(state), 48, 64, 48);
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
