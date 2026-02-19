package org.govpraya.builder;

import org.bukkit.plugin.java.JavaPlugin;

public class PrayaBuilderPlugin extends JavaPlugin {

    @Override
    public void onEnable() {
        saveDefaultConfig();

        String apiKey = getConfig().getString("gemini.api-key", "");
        if (apiKey.isEmpty() || apiKey.equals("YOUR_API_KEY_HERE")) {
            getLogger().warning("Gemini API key not configured! Set it in config.yml");
        }

        getLogger().info("Praya Builder v" + getDescription().getVersion() + " enabled");
    }

    @Override
    public void onDisable() {
        getLogger().info("Praya Builder disabled");
    }
}
