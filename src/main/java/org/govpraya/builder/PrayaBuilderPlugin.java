package org.govpraya.builder;

import org.bukkit.plugin.java.JavaPlugin;

import org.govpraya.builder.ai.GeminiClient;
import org.govpraya.builder.ai.BlockGenerator;

public class PrayaBuilderPlugin extends JavaPlugin {

    private BlockGenerator generator;
    private org.govpraya.builder.generation.TestWorldBridge bridge;

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
        if ("1".equals(System.getenv("BUILDER_TEST_BRIDGE"))) {
            try { bridge = new org.govpraya.builder.generation.TestWorldBridge(this); }
            catch (Exception error) { getLogger().severe("Isolated bridge disabled: " + error.getMessage()); }
        }

        getLogger().info("Praya Builder v" + getPluginMeta().getVersion() + " enabled");
    }

    @Override
    public void onDisable() {
        if (bridge != null) bridge.close();
        getLogger().info("Praya Builder disabled");
    }

    public BlockGenerator getGenerator() {
        return generator;
    }
}
