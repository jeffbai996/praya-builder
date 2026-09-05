package org.govpraya.builder.ai;

/** Model adapters return grid JSON; parsing and world edits belong to the caller. */
@FunctionalInterface
public interface BlockGenerator {
    String generate(String systemPrompt, String userPrompt) throws GenerationException;
}
