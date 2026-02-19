package com.openlineage.server.storage;

import com.openlineage.server.storage.document.DocumentDbSanitizer;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class DocumentDbSanitizerTest {

    @Test
    public void testSanitizeKeyReplacesDotsAndDollars() {
        assertEquals("com_dot_example_dot_key", DocumentDbSanitizer.sanitizeKey("com.example.key"));
        assertEquals("_dollar_ref", DocumentDbSanitizer.sanitizeKey("$ref"));
        assertEquals("_dollar_schema_dot_url", DocumentDbSanitizer.sanitizeKey("$schema.url"));
    }

    @Test
    public void testSanitizeKeyReplacesNullByte() {
        assertEquals("bad_null_key", DocumentDbSanitizer.sanitizeKey("bad\0key"));
    }

    @Test
    public void testSanitizeKeyNullInput() {
        assertNull(DocumentDbSanitizer.sanitizeKey(null));
    }

    @Test
    public void testSanitizeKeyPassthroughCleanKey() {
        assertEquals("normalKey", DocumentDbSanitizer.sanitizeKey("normalKey"));
    }

    @Test
    public void testUnsanitizeKeyRoundTrip() {
        String[] testKeys = {
                "com.example.key",
                "$ref",
                "$schema.url",
                "normal_key",
                "has.dots.and.$dollars",
                "nested.key.$with.all\0bad"
        };

        for (String original : testKeys) {
            String sanitized = DocumentDbSanitizer.sanitizeKey(original);
            String restored = DocumentDbSanitizer.unsanitizeKey(sanitized);
            assertEquals(original, restored, "Round-trip failed for key: " + original);
        }
    }

    @Test
    public void testSanitizeMapRecursively() {
        Map<String, Object> input = new HashMap<>();
        input.put("top.level", "value1");
        Map<String, Object> nested = new HashMap<>();
        nested.put("$inner.key", "value2");
        input.put("nested", nested);

        @SuppressWarnings("unchecked")
        Map<String, Object> result = (Map<String, Object>) DocumentDbSanitizer.sanitize(input);

        assertNotNull(result);
        assertTrue(result.containsKey("top_dot_level"));
        assertEquals("value1", result.get("top_dot_level"));

        @SuppressWarnings("unchecked")
        Map<String, Object> nestedResult = (Map<String, Object>) result.get("nested");
        assertNotNull(nestedResult);
        assertTrue(nestedResult.containsKey("_dollar_inner_dot_key"));
    }

    @Test
    public void testSanitizeListRecursively() {
        Map<String, Object> mapItem = new HashMap<>();
        mapItem.put("key.with.dots", "val");
        List<Object> input = List.of(mapItem, "plain_string", 42);

        @SuppressWarnings("unchecked")
        List<Object> result = (List<Object>) DocumentDbSanitizer.sanitize(input);

        assertNotNull(result);
        assertEquals(3, result.size());

        @SuppressWarnings("unchecked")
        Map<String, Object> resultMap = (Map<String, Object>) result.get(0);
        assertTrue(resultMap.containsKey("key_dot_with_dot_dots"));
    }

    @Test
    public void testUnsanitizeMapRoundTrip() {
        Map<String, Object> original = new HashMap<>();
        original.put("com.openlineage.facet", "value");
        Map<String, Object> nested = new HashMap<>();
        nested.put("$schema", "http://example.com");
        original.put("inner", nested);

        Object sanitized = DocumentDbSanitizer.sanitize(original);
        Object restored = DocumentDbSanitizer.unsanitize(sanitized);

        @SuppressWarnings("unchecked")
        Map<String, Object> restoredMap = (Map<String, Object>) restored;
        assertTrue(restoredMap.containsKey("com.openlineage.facet"));

        @SuppressWarnings("unchecked")
        Map<String, Object> restoredNested = (Map<String, Object>) restoredMap.get("inner");
        assertTrue(restoredNested.containsKey("$schema"));
    }

    @Test
    public void testSanitizeNullReturnsNull() {
        assertNull(DocumentDbSanitizer.sanitize(null));
        assertNull(DocumentDbSanitizer.unsanitize(null));
    }
}
