package org.govpraya.builder.plan;

import java.nio.file.Files;
import java.nio.file.Path;

/** Local compiler entrypoint. Output is consumed by the preview build script. */
public final class PlanCli {
    public static void main(String[] args) throws Exception {
        if (args.length != 1) throw new IllegalArgumentException("Usage: PlanCli plan.json");
        Path path = Path.of(args[0]);
        if (Files.size(path) > 1_048_576) throw new IllegalArgumentException("Plan exceeds 1 MiB");
        System.out.println(PlanCompiler.compile(Files.readString(path)));
    }
}
