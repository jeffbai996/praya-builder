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

public class GeminiClient {

    private static final String BASE_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";

    private final HttpClient httpClient;
    private final String apiKey;
    private final String model;
    private final Logger logger;
    private final Gson gson;

    public GeminiClient(String apiKey, String model, Logger logger) {
        this.apiKey = apiKey;
        this.model = model;
        this.logger = logger;
        this.gson = new Gson();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * Sends a prompt to Gemini and returns the text content from the response.
     * Blocks the calling thread — call from an async task only.
     */
    public String generate(String systemPrompt, String userPrompt) throws GeminiException {
        String requestBody = buildRequestBody(systemPrompt, userPrompt);
        String url = BASE_URL.formatted(model) + "?key=" + apiKey;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .timeout(Duration.ofSeconds(60))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                logger.severe("Gemini API error " + response.statusCode() + ": " + response.body());
                throw new GeminiException("API returned HTTP " + response.statusCode());
            }

            return extractText(response.body());

        } catch (IOException e) {
            throw new GeminiException("Network error: " + e.getMessage(), e);
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
            return root.getAsJsonArray("candidates")
                    .get(0).getAsJsonObject()
                    .getAsJsonObject("content")
                    .getAsJsonArray("parts")
                    .get(0).getAsJsonObject()
                    .get("text").getAsString();
        } catch (Exception e) {
            throw new GeminiException("Failed to parse Gemini response: " + e.getMessage(), e);
        }
    }

    public static class GeminiException extends Exception {
        public GeminiException(String message) { super(message); }
        public GeminiException(String message, Throwable cause) { super(message, cause); }
    }
}
