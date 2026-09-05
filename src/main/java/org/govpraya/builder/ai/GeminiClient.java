package org.govpraya.builder.ai;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.logging.Logger;

public class GeminiClient implements BlockGenerator {

    private static final String BASE_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";

    private final HttpClient httpClient;
    private final String apiKey;
    private final Logger logger;
    private final Gson gson;
    private final URI endpoint;

    public GeminiClient(String apiKey, String model, Logger logger) {
        this(apiKey, model, logger, HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10)).build(), endpointFor(model));
    }

    GeminiClient(String apiKey, String model, Logger logger, HttpClient httpClient, URI endpoint) {
        this.apiKey = apiKey;
        this.logger = logger;
        this.gson = new Gson();
        this.httpClient = httpClient;
        this.endpoint = endpoint;
    }

    private static URI endpointFor(String model) {
        if (model == null || !model.matches("[a-zA-Z0-9._-]+")) {
            throw new IllegalArgumentException("Invalid Gemini model identifier.");
        }
        return URI.create(BASE_URL.formatted(model));
    }

    /**
     * Sends a prompt to Gemini and returns the text content from the response.
     * Blocks the calling thread — call from an async task only.
     */
    public String generate(String systemPrompt, String userPrompt) throws GeminiException {
        String requestBody = buildRequestBody(systemPrompt, userPrompt);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(endpoint)
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .timeout(Duration.ofSeconds(60))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                logger.warning("Gemini API returned HTTP " + response.statusCode());
                throw new GeminiException("API returned HTTP " + response.statusCode());
            }

            return extractText(response.body());

        } catch (IOException e) {
            throw new GeminiException("Could not reach Gemini (network error or timeout).", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new GeminiException("Request interrupted", e);
        }
    }

    private String buildRequestBody(String systemPrompt, String userPrompt) {
        JsonObject body = new JsonObject();

        JsonObject sysPart = new JsonObject();
        sysPart.addProperty("text", systemPrompt);
        JsonArray sysParts = new JsonArray();
        sysParts.add(sysPart);
        JsonObject sysInstruction = new JsonObject();
        sysInstruction.add("parts", sysParts);
        body.add("system_instruction", sysInstruction);

        JsonObject userPart = new JsonObject();
        userPart.addProperty("text", userPrompt);
        JsonArray userParts = new JsonArray();
        userParts.add(userPart);
        JsonObject content = new JsonObject();
        content.add("parts", userParts);
        JsonArray contents = new JsonArray();
        contents.add(content);
        body.add("contents", contents);

        JsonObject config = new JsonObject();
        config.addProperty("temperature", 0.7);
        config.addProperty("responseMimeType", "application/json");
        body.add("generationConfig", config);

        return gson.toJson(body);
    }

    private String extractText(String responseJson) throws GeminiException {
        try {
            JsonObject root = JsonParser.parseString(responseJson).getAsJsonObject();
            JsonArray candidates = root.getAsJsonArray("candidates");
            if (candidates == null || candidates.isEmpty()) {
                throw new GeminiException("No candidate returned; the request may have been blocked.");
            }
            JsonObject candidate = candidates.get(0).getAsJsonObject();
            if (candidate.has("finishReason") && !"STOP".equals(candidate.get("finishReason").getAsString())) {
                throw new GeminiException("Generation did not finish successfully ("
                        + candidate.get("finishReason").getAsString() + "). Try a smaller build.");
            }
            StringBuilder text = new StringBuilder();
            for (var element : candidate.getAsJsonObject("content").getAsJsonArray("parts")) {
                JsonObject part = element.getAsJsonObject();
                if ((!part.has("thought") || !part.get("thought").getAsBoolean()) && part.has("text")) {
                    text.append(part.get("text").getAsString());
                }
            }
            if (text.toString().isBlank()) {
                throw new GeminiException("Generation returned no build text.");
            }
            return text.toString();
        } catch (GeminiException e) {
            throw e;
        } catch (Exception e) {
            throw new GeminiException("Malformed Gemini response.", e);
        }
    }

    public static class GeminiException extends GenerationException {
        public GeminiException(String message) { super(message); }
        public GeminiException(String message, Throwable cause) { super(message, cause); }
    }
}
