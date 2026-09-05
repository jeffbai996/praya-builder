package org.govpraya.builder.generation;

import com.sk89q.worldedit.EditSession;
import com.sk89q.worldedit.MaxChangedBlocksException;
import com.sk89q.worldedit.WorldEdit;
import com.sk89q.worldedit.LocalSession;
import com.sk89q.worldedit.bukkit.BukkitAdapter;
import com.sk89q.worldedit.extent.clipboard.BlockArrayClipboard;
import com.sk89q.worldedit.extent.clipboard.io.BuiltInClipboardFormat;
import com.sk89q.worldedit.extent.clipboard.io.ClipboardWriter;
import com.sk89q.worldedit.math.BlockVector3;
import com.sk89q.worldedit.regions.CuboidRegion;
import com.sk89q.worldedit.world.block.BlockState;

import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.entity.Player;

import java.io.File;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SchematicPlacer {

    /**
     * Places blocks directly in the world at the given location.
     * Must be called from the main server thread.
     *
     * @return number of blocks successfully placed
     */
    public static int placeAtLocation(BlockGrid grid, Location location, Player player)
            throws MaxChangedBlocksException {
        if (location.getWorld() == null || !player.getWorld().equals(location.getWorld())) {
            throw new IllegalArgumentException("The player must still be in the target world.");
        }
        if (location.getBlockY() < location.getWorld().getMinHeight()
                || (long) location.getBlockY() + grid.dimY() > location.getWorld().getMaxHeight()) {
            throw new IllegalArgumentException("Build exceeds the world's height limits.");
        }
        // Resolve every state before editing so a bad block cannot cause a partial build.
        List<PreparedBlock> blocks = prepare(grid);
        BlockVector3 origin = BukkitAdapter.asBlockVector(location);
        int placed = 0;

        var actor = BukkitAdapter.adapt(player);
        LocalSession session = WorldEdit.getInstance().getSessionManager().get(actor);
        EditSession editSession = session.createEditSession(actor);
        try (editSession) {
            int existingLimit = editSession.getBlockChangeLimit();
            editSession.setBlockChangeLimit(existingLimit < 0
                    ? grid.blockCount() : Math.min(existingLimit, grid.blockCount()));
            for (PreparedBlock block : blocks) {
                if (editSession.setBlock(origin.add(block.position()), block.state())) {
                    placed++;
                }
            }
        } finally {
            // Keep completed or partial changes in the player's normal //undo history.
            session.remember(editSession);
        }

        return placed;
    }

    /**
     * Saves the grid as a .schem file (Sponge v3 format).
     * Call on the server thread because state validation uses the Bukkit registry.
     * Existing files are never overwritten.
     */
    public static void saveSchematic(BlockGrid grid, File outputFile) throws IOException {
        List<PreparedBlock> blocks = prepare(grid);
        BlockVector3 min = BlockVector3.ZERO;
        BlockVector3 max = BlockVector3.at(
                grid.dimX() - 1,
                grid.dimY() - 1,
                grid.dimZ() - 1
        );
        CuboidRegion region = new CuboidRegion(min, max);

        BlockArrayClipboard clipboard = new BlockArrayClipboard(region);
        clipboard.setOrigin(BlockVector3.ZERO);

        for (PreparedBlock block : blocks) {
            clipboard.setBlock(block.position(), block.state());
        }

        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ClipboardWriter writer = BuiltInClipboardFormat.SPONGE_V3_SCHEMATIC
                .getWriter(bytes)) {
            writer.write(clipboard);
        }
        Files.createDirectories(outputFile.toPath().toAbsolutePath().getParent());
        Files.write(outputFile.toPath(), bytes.toByteArray(), StandardOpenOption.CREATE_NEW,
                StandardOpenOption.WRITE);
    }

    private static List<PreparedBlock> prepare(BlockGrid grid) {
        Map<String, BlockState> states = new HashMap<>();
        List<PreparedBlock> blocks = new ArrayList<>();
        for (BlockGrid.Entry entry : grid.entries()) {
            BlockState state = states.computeIfAbsent(entry.blockId(),
                    id -> BukkitAdapter.adapt(Bukkit.createBlockData(id)));
            blocks.add(new PreparedBlock(BlockVector3.at(entry.x(), entry.y(), entry.z()), state));
        }
        return blocks;
    }

    private record PreparedBlock(BlockVector3 position, BlockState state) {}
}
