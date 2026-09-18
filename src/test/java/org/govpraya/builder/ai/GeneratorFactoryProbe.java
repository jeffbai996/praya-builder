package org.govpraya.builder.ai;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Handler;
import java.util.logging.Level;
import java.util.logging.LogRecord;
import java.util.logging.Logger;

/** Exercises credential resolution and provider selection without a server or network. */
public final class GeneratorFactoryProbe {
    public static void main(String[] args) throws Exception {
        Map<String, String> env = new HashMap<>();
        Map<String, String> config = new HashMap<>();
        Path dataFolder = Files.createTempDirectory("praya-builder-probe");
        String provider = "gemini";

        for (String arg : args) {
            String[] pair = arg.split("=", 2);
            String value = pair.length > 1 ? pair[1] : "";
            switch (pair[0]) {
                case "env" -> env.put(GeneratorFactory.ENV_KEY, value);
                case "envfile" -> env.put(GeneratorFactory.ENV_KEY_FILE, write(dataFolder, "env-key.txt", value));
                case "configfile" -> config.put("gemini.api-key-file", write(dataFolder, "config-key.txt", value));
                case "configfile-relative" -> {
                    write(dataFolder, "relative-key.txt", value);
                    config.put("gemini.api-key-file", "relative-key.txt");
                }
                case "missingfile" -> config.put("gemini.api-key-file", dataFolder.resolve("missing.txt").toString());
                case "inline" -> config.put("gemini.api-key", value);
                case "provider" -> provider = value;
                default -> throw new IllegalArgumentException("Unknown probe argument: " + pair[0]);
            }
        }

        List<String> warnings = new ArrayList<>();
        Logger logger = Logger.getAnonymousLogger();
        logger.setUseParentHandlers(false);
        logger.addHandler(new Handler() {
            @Override public void publish(LogRecord record) {
                if (record.getLevel().intValue() >= Level.WARNING.intValue()) warnings.add(record.getMessage());
            }
            @Override public void flush() { }
            @Override public void close() { }
        });

        var credential = GeneratorFactory.resolveApiKey(env, config::get, dataFolder, logger);
        BlockGenerator generator = GeneratorFactory.create(provider, credential, "example-model", logger);

        System.out.println("credential=" + credential.map(GeneratorFactory.Credential::source).orElse("absent"));
        System.out.println("value=" + credential.map(GeneratorFactory.Credential::value).orElse(""));
        System.out.println("generator=" + (generator != null ? "present" : "absent"));
        System.out.println("warnings=" + warnings.size());
        warnings.forEach(System.err::println);
    }

    private static String write(Path folder, String name, String content) throws Exception {
        Path file = folder.resolve(name);
        Files.writeString(file, content);
        return file.toString();
    }
}
