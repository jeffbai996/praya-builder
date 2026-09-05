package org.govpraya.builder.ai;

import com.google.gson.JsonParser;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import java.util.logging.Logger;

public final class GeminiHttpProbe {
    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicReference<String> requestError = new AtomicReference<>();
        server.createContext("/generate", exchange -> {
            try {
                var body = JsonParser.parseString(new String(exchange.getRequestBody().readAllBytes(),
                        StandardCharsets.UTF_8)).getAsJsonObject();
                if (!"POST".equals(exchange.getRequestMethod()) || exchange.getRequestURI().getQuery() != null
                        || !"example-key".equals(exchange.getRequestHeaders().getFirst("x-goog-api-key"))
                        || !body.has("contents") || !body.has("system_instruction")) {
                    requestError.set("Incorrect request envelope or credentials in URL");
                }
                byte[] response = args[1].getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(Integer.parseInt(args[0]), response.length);
                exchange.getResponseBody().write(response);
            } finally {
                exchange.close();
            }
        });
        server.start();
        try {
            var client = new GeminiClient("example-key", "example-model", Logger.getAnonymousLogger(),
                    HttpClient.newHttpClient(), URI.create("http://127.0.0.1:"
                    + server.getAddress().getPort() + "/generate"));
            BlockGenerator generator = client;
            try {
                System.out.println(generator.generate("Example rules", "Example house"));
            } catch (GenerationException e) {
                System.err.println(e.getMessage());
                if (requestError.get() != null) throw new AssertionError(requestError.get());
                System.exit(2);
            }
            if (requestError.get() != null) throw new AssertionError(requestError.get());
        } finally {
            server.stop(0);
        }
    }
}
