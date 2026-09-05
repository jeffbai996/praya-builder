package org.govpraya.builder;

import org.bukkit.plugin.java.JavaPlugin;

import org.govpraya.builder.ai.GeminiClient;
import org.govpraya.builder.ai.BlockGenerator;

public class PrayaBuilderPlugin extends JavaPlugin {

    private BlockGenerator generator;

    @Override
    public void onEnable() {
        saveDefaultConfig();

        String apiKey = System.getenv("GEMINI_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            apiKey = getConfig().getString("gemini.api-key", "");
        }
        String model = getConfig().getString("gemini.model", "gemini-2.5-flash");

        if (apiKey.isEmpty() || apiKey.equals("YOUR_API_KEY_HERE")) {
            getLogger().warning("Gemini API key not configured. Set GEMINI_API_KEY or gemini.api-key.");
        } else {
            generator = new GeminiClient(apiKey, model, getLogger());
        }

        getCommand("pbuilder").setExecutor(new BuilderCommand(this));

        getLogger().info("Praya Builder v" + getPluginMeta().getVersion() + " enabled");
    }

    @Override
    public void onDisable() {
        getLogger().info("Praya Builder disabled");
    }

    public BlockGenerator getGenerator() {
        return generator;
    }
}
