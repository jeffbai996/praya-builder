package org.govpraya.builder.ai;

import java.util.logging.Logger;

public final class GeminiProbe {
    public static void main(String[] args) throws Exception {
        GeminiClient client = new GeminiClient("example-key", "example-model", Logger.getAnonymousLogger());
        var method = GeminiClient.class.getDeclaredMethod("extractText", String.class);
        method.setAccessible(true);
        System.out.println(method.invoke(client, args[0]));
    }
}
