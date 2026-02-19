package org.govpraya.builder.generation;

import com.sk89q.worldedit.EditSession;
import com.sk89q.worldedit.MaxChangedBlocksException;
import com.sk89q.worldedit.WorldEdit;
import com.sk89q.worldedit.bukkit.BukkitAdapter;
import com.sk89q.worldedit.extent.clipboard.BlockArrayClipboard;
import com.sk89q.worldedit.extent.clipboard.io.BuiltInClipboardFormat;
import com.sk89q.worldedit.extent.clipboard.io.ClipboardWriter;
import com.sk89q.worldedit.math.BlockVector3;
import com.sk89q.worldedit.regions.CuboidRegion;
import com.sk89q.worldedit.world.World;
import com.sk89q.worldedit.world.block.BlockType;
import com.sk89q.worldedit.world.block.BlockTypes;

import org.bukkit.Location;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

public class SchematicPlacer {

    /**
     * Places blocks directly in the world at the given location.
     * Must be called from the main server thread.
     *
     * @return number of blocks successfully placed
     */
    public static int placeAtLocation(BlockGrid grid, Location location) {
        World weWorld = BukkitAdapter.adapt(location.getWorld());
        BlockVector3 origin = BukkitAdapter.asBlockVector(location);
        int placed = 0;

        try (EditSession editSession = WorldEdit.getInstance().newEditSession(weWorld)) {
            for (BlockGrid.Entry entry : grid.entries()) {
                BlockType type = BlockTypes.get(entry.blockId());
                if (type == null) {
                    type = BlockTypes.STONE;
                }

                BlockVector3 pos = origin.add(entry.x(), entry.y(), entry.z());
                try {
                    editSession.setBlock(pos, type.getDefaultState());
                    placed++;
                } catch (MaxChangedBlocksException e) {
                    break;
                }
            }
        }

        return placed;
    }

    /**
     * Saves the grid as a .schem file (Sponge v3 format).
     * Can be called from any thread.
     */
    public static void saveSchematic(BlockGrid grid, File outputFile) throws IOException {
        BlockVector3 min = BlockVector3.ZERO;
        BlockVector3 max = BlockVector3.at(
                grid.dimX() - 1,
                grid.dimY() - 1,
                grid.dimZ() - 1
        );
        CuboidRegion region = new CuboidRegion(min, max);

        BlockArrayClipboard clipboard = new BlockArrayClipboard(region);
        clipboard.setOrigin(BlockVector3.ZERO);

        for (BlockGrid.Entry entry : grid.entries()) {
            BlockType type = BlockTypes.get(entry.blockId());
            if (type == null) {
                type = BlockTypes.STONE;
            }
            clipboard.setBlock(
                    BlockVector3.at(entry.x(), entry.y(), entry.z()),
                    type.getDefaultState()
            );
        }

        outputFile.getParentFile().mkdirs();
        try (ClipboardWriter writer = BuiltInClipboardFormat.SPONGE_V3_SCHEMATIC
                .getWriter(new FileOutputStream(outputFile))) {
            writer.write(clipboard);
        }
    }
}
