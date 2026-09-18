package org.govpraya.builder;

import org.bukkit.plugin.java.JavaPlugin;

import org.govpraya.builder.ai.GeneratorFactory;
import org.govpraya.builder.ai.BlockGenerator;

public class PrayaBuilderPlugin extends JavaPlugin {

    private BlockGenerator generator;
    private org.govpraya.builder.generation.TestWorldBridge bridge;

    @Override
    public void onEnable() {
        saveDefaultConfig();

        java.util.Optional<GeneratorFactory.Credential> credential = GeneratorFactory.resolveApiKey(
                System.getenv(), key -> getConfig().getString(key), getDataFolder().toPath(), getLogger());
        String model = getConfig().getString("gemini.model", "gemini-2.5-flash");
        generator = GeneratorFactory.create(getConfig().getString("ai.provider", "gemini"), credential, model, getLogger());

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
