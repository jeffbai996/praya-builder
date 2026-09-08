package org.govpraya.builder.plan;

import com.google.gson.*;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Pattern;

final class PlanInput {
    private static final Pattern STATE = Pattern.compile("minecraft:[a-z0-9_]+(?:\\[[a-z0-9_]+=[a-z0-9_]+(?:,[a-z0-9_]+=[a-z0-9_]+)*\\])?");
    private PlanInput() {}

    static void fields(JsonObject obj, String... allowed) {
        var keys = Set.of(allowed);
        for (String key : obj.keySet()) {
            if (!keys.contains(key)) throw new IllegalArgumentException("Unknown field: " + key);
        }
    }

    static int integer(JsonElement value) {
        if (value == null || !value.isJsonPrimitive() || !value.getAsJsonPrimitive().isNumber())
            throw new IllegalArgumentException("Expected integer number");
        try { return value.getAsBigDecimal().intValueExact(); }
        catch (ArithmeticException e) { throw new IllegalArgumentException("Integer outside range", e); }
    }

    static int[] vector(JsonElement value) {
        if (value == null || !value.isJsonArray() || value.getAsJsonArray().size() != 3)
            throw new IllegalArgumentException("Expected three integer coordinates");
        var array = value.getAsJsonArray();
        return new int[]{integer(array.get(0)), integer(array.get(1)), integer(array.get(2))};
    }

    static String text(JsonElement value) {
        if (value == null || !value.isJsonPrimitive() || !value.getAsJsonPrimitive().isString())
            throw new IllegalArgumentException("Expected text");
        String text = value.getAsString();
        if (text.isBlank() || text.length() > 512) throw new IllegalArgumentException("Text length invalid");
        return text;
    }

    static String id(JsonElement value) {
        String id = text(value);
        if (!id.matches("[a-zA-Z0-9_-]{1,80}")) throw new IllegalArgumentException("Invalid identifier");
        return id;
    }

    static String state(JsonElement value) {
        String state = text(value);
        if (!STATE.matcher(state).matches()) throw new IllegalArgumentException("Malformed block state: " + state);
        int bracket = state.indexOf('[');
        if (bracket < 0) return state;
        var properties = new TreeMap<String, String>();
        for (String part : state.substring(bracket + 1, state.length() - 1).split(",")) {
            String[] pair = part.split("=");
            if (properties.put(pair[0], pair[1]) != null) throw new IllegalArgumentException("Duplicate state property");
        }
        return state.substring(0, bracket) + "[" + String.join(",", properties.entrySet().stream()
                .map(e -> e.getKey() + "=" + e.getValue()).toList()) + "]";
    }
}
