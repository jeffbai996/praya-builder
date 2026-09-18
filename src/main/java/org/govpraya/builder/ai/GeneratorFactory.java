package org.govpraya.builder.ai;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.logging.Logger;

/**
 * Resolves provider credentials and constructs the configured {@link BlockGenerator}.
 *
 * <p>Credentials never come from source or from committed configuration. Resolution order:
 * <ol>
 *   <li>{@code GEMINI_API_KEY} in the server process environment</li>
 *   <li>{@code GEMINI_API_KEY_FILE} in the environment (path to a file holding only the key)</li>
 *   <li>{@code gemini.api-key-file} in config.yml (relative paths resolve against the plugin data folder)</li>
 *   <li>{@code gemini.api-key} inline in config.yml — deprecated, logs a warning</li>
 * </ol>
 * The key value itself is never logged; only the source it was loaded from.
 */
public final class GeneratorFactory {

    public static final String PLACEHOLDER = "YOUR_API_KEY_HERE";
    static final String ENV_KEY = "GEMINI_API_KEY";
    static final String ENV_KEY_FILE = "GEMINI_API_KEY_FILE";

    /** A resolved secret and a human-readable label of where it came from. */
    public record Credential(String value, String source) { }

    private GeneratorFactory() { }

    public static Optional<Credential> resolveApiKey(Map<String, String> env, Function<String, String> config,
                                                     Path dataFolder, Logger logger) {
        String fromEnv = clean(env.get(ENV_KEY));
        if (fromEnv != null) {
            return Optional.of(new Credential(fromEnv, "environment"));
        }

        String envFile = clean(env.get(ENV_KEY_FILE));
        if (envFile != null) {
            return readKeyFile(Path.of(envFile), "GEMINI_API_KEY_FILE", logger);
        }

        String configFile = clean(config.apply("gemini.api-key-file"));
        if (configFile != null) {
            Path path = Path.of(configFile);
            if (!path.isAbsolute() && dataFolder != null) {
                path = dataFolder.resolve(path);
            }
            return readKeyFile(path, "gemini.api-key-file", logger);
        }

        String inline = clean(config.apply("gemini.api-key"));
        if (inline != null) {
            logger.warning("gemini.api-key is stored inline in config.yml. This is deprecated: move the key to "
                    + "GEMINI_API_KEY in the server environment or to a key file (gemini.api-key-file).");
            return Optional.of(new Credential(inline, "config.yml inline (deprecated)"));
        }
        return Optional.empty();
    }

    /** Builds the generator for {@code ai.provider}; returns {@code null} when generation is unavailable. */
    public static BlockGenerator create(String provider, Optional<Credential> credential, String model, Logger logger) {
        String name = provider == null || provider.isBlank() ? "gemini" : provider.trim().toLowerCase(Locale.ROOT);
        switch (name) {
            case "none" -> {
                logger.info("AI generation disabled (ai.provider: none).");
                return null;
            }
            case "gemini" -> {
                if (credential.isEmpty()) {
                    logger.warning("Gemini API key not configured. Set GEMINI_API_KEY, GEMINI_API_KEY_FILE "
                            + "or gemini.api-key-file.");
                    return null;
                }
                logger.info("Gemini credential loaded from " + credential.get().source() + ".");
                return new GeminiClient(credential.get().value(), model, logger);
            }
            default -> {
                logger.warning("Unknown ai.provider '" + name + "'. Supported values: gemini, none.");
                return null;
            }
        }
    }

    private static Optional<Credential> readKeyFile(Path path, String source, Logger logger) {
        try {
            String value = clean(Files.readString(path, StandardCharsets.UTF_8));
            if (value == null) {
                logger.warning("Key file configured through " + source + " is empty.");
                return Optional.empty();
            }
            return Optional.of(new Credential(value, source));
        } catch (IOException e) {
            logger.warning("Could not read key file configured through " + source + " ("
                    + e.getClass().getSimpleName() + ").");
            return Optional.empty();
        }
    }

    private static String clean(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty() || trimmed.equals(PLACEHOLDER)) {
            return null;
        }
        return trimmed;
    }
}
