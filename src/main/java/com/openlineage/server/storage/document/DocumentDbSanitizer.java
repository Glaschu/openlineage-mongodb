package com.openlineage.server.storage.document;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Sanitizes document keys for AWS DocumentDB compatibility.
 * 
 * DocumentDB (and MongoDB) forbid certain characters in document field names:
 * - '.' (dot) — interpreted as nested path separator
 * - '$' (dollar) — reserved for operators
 * - '\0' (null byte) — forbidden in BSON keys
 * 
 * This class provides bidirectional sanitize/unsanitize so keys can be
 * restored to their original form when reading back from the database.
 */
public class DocumentDbSanitizer {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    // Replacement pairs: original → sanitized (order matters for round-trip safety)
    private static final String[][] KEY_REPLACEMENTS = {
            {".", "_dot_"},
            {"$", "_dollar_"},
            {"\0", "_null_"},
    };

    /**
     * Sanitize a single key string for DocumentDB storage.
     */
    public static String sanitizeKey(String key) {
        if (key == null) return null;
        String result = key;
        for (String[] pair : KEY_REPLACEMENTS) {
            result = result.replace(pair[0], pair[1]);
        }
        return result;
    }

    /**
     * Reverse-sanitize a single key string back to its original form.
     */
    public static String unsanitizeKey(String key) {
        if (key == null) return null;
        String result = key;
        // Reverse order to avoid partial-match conflicts
        for (int i = KEY_REPLACEMENTS.length - 1; i >= 0; i--) {
            result = result.replace(KEY_REPLACEMENTS[i][1], KEY_REPLACEMENTS[i][0]);
        }
        return result;
    }

    /**
     * Recursively sanitize all map keys in an object graph for safe DocumentDB storage.
     * Converts complex objects to Maps via Jackson before traversal.
     */
    public static Object sanitize(Object obj) {
        if (obj == null) {
            return null;
        }

        // Convert complex objects to Maps so we can traverse all properties dynamically
        Object raw;
        try {
            raw = MAPPER.convertValue(obj, Object.class);
        } catch (IllegalArgumentException e) {
            raw = obj;
        }

        return sanitizeInternal(raw);
    }

    /**
     * Recursively unsanitize all map keys in an object graph, restoring original key names.
     */
    public static Object unsanitize(Object obj) {
        if (obj == null) {
            return null;
        }
        return unsanitizeInternal(obj);
    }

    private static Object sanitizeInternal(Object obj) {
        if (obj instanceof Map) {
            Map<?, ?> map = (Map<?, ?>) obj;
            Map<String, Object> sanitizedMap = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                String key = String.valueOf(entry.getKey());
                String sanitizedKey = sanitizeKey(key);
                sanitizedMap.put(sanitizedKey, sanitizeInternal(entry.getValue()));
            }
            return sanitizedMap;
        } else if (obj instanceof List) {
            List<?> list = (List<?>) obj;
            List<Object> sanitizedList = new ArrayList<>();
            for (Object item : list) {
                sanitizedList.add(sanitizeInternal(item));
            }
            return sanitizedList;
        }
        return obj;
    }

    private static Object unsanitizeInternal(Object obj) {
        if (obj instanceof Map) {
            Map<?, ?> map = (Map<?, ?>) obj;
            Map<String, Object> unsanitizedMap = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                String key = String.valueOf(entry.getKey());
                String unsanitizedKey = unsanitizeKey(key);
                unsanitizedMap.put(unsanitizedKey, unsanitizeInternal(entry.getValue()));
            }
            return unsanitizedMap;
        } else if (obj instanceof List) {
            List<?> list = (List<?>) obj;
            List<Object> unsanitizedList = new ArrayList<>();
            for (Object item : list) {
                unsanitizedList.add(unsanitizeInternal(item));
            }
            return unsanitizedList;
        }
        return obj;
    }
}
