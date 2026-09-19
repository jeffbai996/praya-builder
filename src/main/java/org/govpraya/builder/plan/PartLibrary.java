package org.govpraya.builder.plan;

import com.google.gson.*;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import static java.nio.file.LinkOption.NOFOLLOW_LINKS;
import static org.govpraya.builder.plan.PlanInput.*;

/** Bounded, data-only architectural part library. Bundled definitions win name clashes. */
final class PartLibrary {
    private static final int MAX_PARTS = 128;
    private static final int MAX_PART_BYTES = 262_144;
    private static final int MAX_TOTAL_BYTES = 4_194_304;
    private static final String INDEX = "/parts/index.json";
    private static final PartLibrary BUNDLED = load(null);
    private final Map<String, JsonObject> parts;

    private PartLibrary(Map<String, JsonObject> parts) {
        this.parts = Collections.unmodifiableMap(new TreeMap<>(parts));
    }
    static PartLibrary bundled() { return BUNDLED; }
    static PartLibrary load(Path workspace) {
        try {
            var bundled = loadBundled();
            var combined = new TreeMap<String, JsonObject>();
            if (workspace != null && Files.exists(workspace, NOFOLLOW_LINKS)) combined.putAll(loadWorkspace(workspace));
            combined.putAll(bundled); // Versioned jar definitions are authoritative.
            if (combined.size() > MAX_PARTS) throw new IllegalArgumentException("Part count limit exceeded");
            validateGraph(combined);
            return new PartLibrary(combined);
        } catch (IOException error) {
            throw new IllegalArgumentException("Cannot load part library", error);
        }
    }

    JsonObject get(String name) {
        JsonObject part = parts.get(name);
        if (part == null) throw new IllegalArgumentException("Unknown part: " + name);
        return part;
    }
    Collection<JsonObject> all() { return parts.values(); }
    JsonObject catalog() {
        JsonObject result = new JsonObject(); result.addProperty("schema_version", 1);
        JsonArray entries = new JsonArray();
        for (JsonObject part : parts.values()) entries.add(part.deepCopy());
        result.add("parts", entries); return result;
    }

    private static Map<String, JsonObject> loadBundled() throws IOException {
        byte[] indexBytes = resource(INDEX);
        if (indexBytes.length > MAX_PART_BYTES) throw new IllegalArgumentException("Part index too large");
        JsonObject index = object(indexBytes, "part index"); fields(index, "schema_version", "parts");
        if (integer(index.get("schema_version")) != 1) throw new IllegalArgumentException("Unsupported part index version");
        JsonArray files = index.getAsJsonArray("parts");
        if (files.size() > MAX_PARTS) throw new IllegalArgumentException("Part count limit exceeded");
        var result = new TreeMap<String, JsonObject>(); int total = indexBytes.length;
        for (JsonElement element : files) {
            String file = text(element);
            if (!file.matches("[a-z0-9_.-]+\\.json") || file.contains("..")) throw new IllegalArgumentException("Invalid bundled part path");
            byte[] bytes = resource("/parts/" + file); total = Math.addExact(total, bytes.length);
            if (bytes.length > MAX_PART_BYTES || total > MAX_TOTAL_BYTES) throw new IllegalArgumentException("Part library size limit exceeded");
            add(result, object(bytes, file), "bundled " + file);
        }
        return result;
    }

    private static Map<String, JsonObject> loadWorkspace(Path workspace) throws IOException {
        if (Files.isSymbolicLink(workspace) || !Files.isDirectory(workspace, NOFOLLOW_LINKS))
            throw new IllegalArgumentException("Workspace parts path must be a real directory");
        Path root = workspace.toRealPath(NOFOLLOW_LINKS); var files = new ArrayList<Path>();
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(root, "*.json")) {
            for (Path file : stream) files.add(file);
        }
        files.sort(Comparator.comparing(path -> path.getFileName().toString()));
        if (files.size() > MAX_PARTS) throw new IllegalArgumentException("Part count limit exceeded");
        var result = new TreeMap<String, JsonObject>(); int total = 0;
        for (Path file : files) {
            if (Files.isSymbolicLink(file) || !Files.isRegularFile(file, NOFOLLOW_LINKS)
                    || !file.toRealPath(NOFOLLOW_LINKS).getParent().equals(root))
                throw new IllegalArgumentException("Workspace part must be a direct regular file");
            long size = Files.size(file); if (size > MAX_PART_BYTES) throw new IllegalArgumentException("Part file too large");
            total = Math.addExact(total, Math.toIntExact(size));
            if (total > MAX_TOTAL_BYTES) throw new IllegalArgumentException("Part library size limit exceeded");
            add(result, object(Files.readAllBytes(file), file.toString()), "workspace " + file.getFileName());
        }
        return result;
    }

    private static void add(Map<String, JsonObject> result, JsonObject part, String source) {
        validate(part); String name = partId(part.get("id"));
        if (result.putIfAbsent(name, part) != null) throw new IllegalArgumentException("Duplicate part: " + name + " in " + source);
    }

    private static void validate(JsonObject part) {
        fields(part, "schema_version", "id", "description", "provenance", "style", "parameters", "bounds",
                "rotation", "components", "signs", "test");
        if (integer(part.get("schema_version")) != 1) throw new IllegalArgumentException("Unsupported part schema");
        partId(part.get("id"));
        if (part.has("description")) text(part.get("description"));
        JsonObject provenance = part.getAsJsonObject("provenance"); fields(provenance, "author", "project");
        text(provenance.get("author")); text(provenance.get("project")); text(part.get("style"));
        JsonObject parameters = part.getAsJsonObject("parameters");
        if (parameters.size() > 32) throw new IllegalArgumentException("Part parameter limit exceeded");
        for (var entry : parameters.entrySet()) validateParameter(id(new JsonPrimitive(entry.getKey())), entry.getValue().getAsJsonObject());
        JsonObject bounds = part.getAsJsonObject("bounds"); fields(bounds, "min", "max");
        templateVector(bounds.get("min")); templateVector(bounds.get("max"));
        if (part.has("rotation")) {
            JsonObject rotation = part.getAsJsonObject("rotation"); fields(rotation, "param", "turns");
            id(rotation.get("param")); JsonObject turns = rotation.getAsJsonObject("turns");
            if (turns.isEmpty() || turns.size() > 32) throw new IllegalArgumentException("Part rotation mapping invalid");
            for (var entry : turns.entrySet()) {
                id(new JsonPrimitive(entry.getKey())); int value = integer(entry.getValue());
                if (value < 0 || value > 3) throw new IllegalArgumentException("Part rotation turns outside range");
            }
        }
        JsonArray components = part.getAsJsonArray("components");
        if (components.isEmpty() || components.size() > 64) throw new IllegalArgumentException("Part component count invalid");
        for (JsonElement element : components) {
            JsonObject component = element.getAsJsonObject(); fields(component, "id", "role", "origin", "operations", "when");
            id(component.get("id")); text(component.get("role")); templateVector(component.get("origin")); condition(component);
            validateOperations(component.getAsJsonArray("operations"), 0);
        }
        if (part.has("signs")) {
            JsonArray signs = part.getAsJsonArray("signs");
            if (signs.size() > 32) throw new IllegalArgumentException("Part sign count invalid");
            var ids = new HashSet<String>();
            for (JsonElement element : signs) {
                JsonObject sign = element.getAsJsonObject(); fields(sign, "id", "at", "required", "lines", "when");
                if (!ids.add(id(sign.get("id")))) throw new IllegalArgumentException("Duplicate part sign slot");
                templateVector(sign.get("at")); condition(sign);
                if (sign.has("required") && (!sign.get("required").isJsonPrimitive() || !sign.getAsJsonPrimitive("required").isBoolean()))
                    throw new IllegalArgumentException("Part sign required must be boolean");
                if (sign.has("lines")) lines(sign.getAsJsonArray("lines"));
            }
        }
        JsonObject test = part.getAsJsonObject("test"); fields(test, "at", "params", "expect");
        if (!test.get("at").isJsonArray() || !test.get("params").isJsonObject()) throw new IllegalArgumentException("Part test invalid");
        JsonObject expect = test.getAsJsonObject("expect"); fields(expect, "valid", "diagnostics");
        if (!expect.get("valid").isJsonPrimitive() || !expect.get("valid").getAsJsonPrimitive().isBoolean())
            throw new IllegalArgumentException("Part test validity must be boolean");
        if (expect.has("diagnostics") && !expect.get("diagnostics").isJsonArray()) throw new IllegalArgumentException("Part test diagnostics invalid");
    }

    private static void validateOperations(JsonArray operations, int depth) {
        if (depth > 8 || operations.size() > 4096) throw new IllegalArgumentException("Part operation nesting invalid");
        for (JsonElement element : operations) {
            JsonObject operation = element.getAsJsonObject(); String type = text(operation.get("op")); condition(operation);
            switch (type) {
                case "block" -> {
                    fields(operation, "op", "at", "material", "when"); templateVector(operation.get("at")); material(operation.get("material"));
                }
                case "box" -> {
                    fields(operation, "op", "min", "max", "material", "when");
                    templateVector(operation.get("min")); templateVector(operation.get("max")); material(operation.get("material"));
                }
                case "fill" -> {
                    fields(operation, "op", "min", "max", "material", "interior", "when");
                    templateVector(operation.get("min")); templateVector(operation.get("max"));
                    material(operation.get("material")); material(operation.get("interior"));
                }
                case "repeat" -> {
                    fields(operation, "op", "count", "step", "operations", "when"); scalar(operation.get("count"));
                    templateVector(operation.get("step")); validateOperations(operation.getAsJsonArray("operations"), depth + 1);
                }
                case "call" -> {
                    fields(operation, "op", "part", "at", "params", "signs", "when"); partId(operation.get("part"));
                    templateVector(operation.get("at"));
                    if (operation.has("params") && !operation.get("params").isJsonObject()) throw new IllegalArgumentException("Call params must be object");
                    if (operation.has("signs")) {
                        JsonObject signs = operation.getAsJsonObject("signs");
                        for (var entry : signs.entrySet()) { id(new JsonPrimitive(entry.getKey())); lines(entry.getValue().getAsJsonArray()); }
                    }
                }
                default -> throw new IllegalArgumentException("Unknown part operation: " + type);
            }
        }
    }

    private static void condition(JsonObject object) {
        if (!object.has("when")) return;
        JsonObject when = object.getAsJsonObject("when"); fields(when, "param", "equals"); id(when.get("param"));
        JsonElement equals = when.get("equals");
        if (equals == null || !equals.isJsonPrimitive() || (!equals.getAsJsonPrimitive().isString() && !equals.getAsJsonPrimitive().isNumber()))
            throw new IllegalArgumentException("Part condition value invalid");
    }

    private static void material(JsonElement value) {
        if (value != null && value.isJsonPrimitive() && value.getAsJsonPrimitive().isString()) { id(value); return; }
        JsonObject reference = value.getAsJsonObject(); fields(reference, "param"); id(reference.get("param"));
    }

    private static void scalar(JsonElement value) {
        if (value != null && value.isJsonPrimitive() && value.getAsJsonPrimitive().isNumber()) { integer(value); return; }
        JsonObject template = value.getAsJsonObject(); fields(template, "param", "scale", "offset"); id(template.get("param"));
        if (template.has("scale")) integer(template.get("scale"));
        if (template.has("offset")) integer(template.get("offset"));
    }

    private static void templateVector(JsonElement value) {
        if (value == null || !value.isJsonArray() || value.getAsJsonArray().size() != 3)
            throw new IllegalArgumentException("Part vector needs three coordinates");
        for (JsonElement scalar : value.getAsJsonArray()) scalar(scalar);
    }

    private static void lines(JsonArray lines) {
        if (lines.size() != 4) throw new IllegalArgumentException("Part sign lines need four entries");
        for (JsonElement line : lines) {
            if (!line.isJsonPrimitive() || !line.getAsJsonPrimitive().isString())
                throw new IllegalArgumentException("Part sign lines must be strings");
            String value = line.getAsString();
            if (value.length() > 24 || value.chars().anyMatch(Character::isISOControl))
                throw new IllegalArgumentException("Part sign line invalid or too long");
        }
    }

    private static void validateParameter(String name, JsonObject definition) {
        String type = text(definition.get("type"));
        if (type.equals("integer")) {
            fields(definition, "type", "min", "max", "default");
            int min = integer(definition.get("min")), max = integer(definition.get("max"));
            if (min < -1024 || max > 1024 || min > max) throw new IllegalArgumentException("Integer parameter bounds invalid: " + name);
            if (definition.has("default")) { int value = integer(definition.get("default")); if (value < min || value > max) throw new IllegalArgumentException("Parameter default outside bounds: " + name); }
        } else if (type.equals("enum")) {
            fields(definition, "type", "values", "default"); JsonArray values = definition.getAsJsonArray("values");
            if (values.isEmpty() || values.size() > 32) throw new IllegalArgumentException("Enum parameter values invalid: " + name);
            var allowed = new HashSet<String>(); for (JsonElement value : values) if (!allowed.add(id(value))) throw new IllegalArgumentException("Duplicate enum value: " + name);
            if (definition.has("default") && !allowed.contains(id(definition.get("default")))) throw new IllegalArgumentException("Enum default invalid: " + name);
        } else if (type.equals("material")) {
            fields(definition, "type", "default"); if (definition.has("default")) id(definition.get("default"));
        } else throw new IllegalArgumentException("Unknown parameter type: " + type);
    }

    private static void validateGraph(Map<String, JsonObject> parts) {
        var graph = new TreeMap<String, Set<String>>();
        for (var entry : parts.entrySet()) {
            var calls = new TreeSet<String>();
            for (JsonElement component : entry.getValue().getAsJsonArray("components"))
                collectCalls(component.getAsJsonObject().getAsJsonArray("operations"), calls, 0);
            for (String call : calls) if (!parts.containsKey(call)) throw new IllegalArgumentException("Unknown part: " + call);
            graph.put(entry.getKey(), calls);
        }
        var visiting = new HashSet<String>(); var done = new HashSet<String>();
        for (String part : graph.keySet()) visit(part, graph, visiting, done);
    }

    private static void collectCalls(JsonArray operations, Set<String> calls, int depth) {
        if (depth > 8) throw new IllegalArgumentException("Part operation nesting too deep");
        for (JsonElement element : operations) {
            JsonObject operation = element.getAsJsonObject(); String type = text(operation.get("op"));
            if (type.equals("call")) calls.add(partId(operation.get("part")));
            if (operation.has("operations")) collectCalls(operation.getAsJsonArray("operations"), calls, depth + 1);
        }
    }
    private static void visit(String part, Map<String, Set<String>> graph, Set<String> visiting, Set<String> done) {
        if (done.contains(part)) return;
        if (!visiting.add(part)) throw new IllegalArgumentException("Part call cycle: " + part);
        for (String next : graph.get(part)) visit(next, graph, visiting, done);
        visiting.remove(part); done.add(part);
    }

    private static byte[] resource(String name) throws IOException {
        try (InputStream stream = PartLibrary.class.getResourceAsStream(name)) {
            if (stream == null) throw new IllegalArgumentException("Missing bundled part resource: " + name);
            return stream.readAllBytes();
        }
    }
    private static JsonObject object(byte[] bytes, String source) {
        try { return JsonParser.parseString(new String(bytes, StandardCharsets.UTF_8)).getAsJsonObject(); }
        catch (RuntimeException error) { throw new IllegalArgumentException("Invalid part JSON: " + source, error); }
    }
    static String partId(JsonElement value) {
        String name = text(value);
        if (!name.matches("[a-z][a-z0-9_-]*(?:\\.[a-z][a-z0-9_-]*)*")) throw new IllegalArgumentException("Invalid part identifier");
        return name;
    }
}
