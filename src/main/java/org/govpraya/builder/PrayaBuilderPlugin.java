package org.govpraya.builder;

import org.bukkit.plugin.java.JavaPlugin;

import org.govpraya.builder.ai.GeminiClient;

public class PrayaBuilderPlugin extends JavaPlugin {

    private GeminiClient geminiClient;

    @Override
    public void onEnable() {
        saveDefaultConfig();

        String apiKey = getConfig().getString("gemini.api-key", "");
        String model = getConfig().getString("gemini.model", "gemini-2.0-flash");

        if (apiKey.isEmpty() || apiKey.equals("YOUR_API_KEY_HERE")) {
            getLogger().warning("Gemini API key not configured! Set it in config.yml");
        } else {
            geminiClient = new GeminiClient(apiKey, model, getLogger());
        }

        getCommand("pbuilder").setExecutor(new BuilderCommand(this));

        getLogger().info("Praya Builder v" + getDescription().getVersion() + " enabled");
    }

    @Override
    public void onDisable() {
        getLogger().info("Praya Builder disabled");
    }

    public GeminiClient getGeminiClient() {
        return geminiClient;
    }
}
