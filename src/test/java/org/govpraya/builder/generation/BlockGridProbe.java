package org.govpraya.builder.generation;

public final class BlockGridProbe {
    public static void main(String[] args) {
        BlockGrid grid = args.length == 1 ? BlockGrid.parse(args[0], 48, 64, 48)
                : BlockGrid.parse(args[0], 48, 64, 48, Integer.parseInt(args[1]));
        System.out.printf("%d,%d,%d,%d%n", grid.dimX(), grid.dimY(), grid.dimZ(), grid.blockCount());
        grid.entries().forEach(entry -> System.out.println(entry.blockId()));
    }
}
