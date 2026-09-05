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
