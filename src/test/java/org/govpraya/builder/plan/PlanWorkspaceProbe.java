package org.govpraya.builder.plan;

import java.nio.file.Path;

/** Regression entrypoint for schema-v2 workspace part loading. */
public final class PlanWorkspaceProbe {
    public static void main(String[] args) {
        if (args.length == 1 && args[0].equals("--parts")) {
            System.out.println(PlanCompiler.parts(null));
            return;
        }
        if (args.length == 2 && args[0].equals("--parts")) {
            System.out.println(PlanCompiler.parts(Path.of(args[1])));
            return;
        }
        System.out.println(PlanCompiler.compile(args[0], args.length == 2 ? Path.of(args[1]) : null));
    }
}
