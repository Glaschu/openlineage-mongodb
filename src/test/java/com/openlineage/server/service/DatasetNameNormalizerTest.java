package com.openlineage.server.service;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class DatasetNameNormalizerTest {

    private final DatasetNameNormalizer normalizer = new DatasetNameNormalizer(true);
    private final DatasetNameNormalizer disabled = new DatasetNameNormalizer(false);

    // --- Hive-style partition stripping ---

    @Test
    public void testStripsTrailingHivePartitions() {
        assertEquals(
                "hdfs://ns1/tenant/rsks/databases/rsks_uat/risk_monikererrors",
                normalizer.normalize(
                        "hdfs://ns1/tenant/rsks/databases/rsks_uat/risk_monikererrors/valuationdate=2025-10-31/datasetid=IDS16958/datasetversion=4"));
    }

    @Test
    public void testStripsSinglePartition() {
        assertEquals(
                "my/path/table",
                normalizer.normalize("my/path/table/year=2025"));
    }

    @Test
    public void testDoesNotStripNonPartitionSegments() {
        assertEquals(
                "my/path/table/subdir",
                normalizer.normalize("my/path/table/subdir"));
    }

    @Test
    public void testDoesNotStripMiddlePartitionSegments() {
        assertEquals(
                "my/path/year=2025/data",
                normalizer.normalize("my/path/year=2025/data"));
    }

    // --- Query string stripping ---

    @Test
    public void testStripsQueryString() {
        assertEquals(
                "hdfs://ns1/tenant/table",
                normalizer.normalize("hdfs://ns1/tenant/table?foo=bar&baz=123"));
    }

    @Test
    public void testStripsQueryStringAndPartitions() {
        assertEquals(
                "hdfs://ns1/tenant/table",
                normalizer.normalize("hdfs://ns1/tenant/table/year=2025?foo=bar"));
    }

    // --- No-op cases ---

    @Test
    public void testNoOpWhenNoParams() {
        String name = "hdfs://ns1/tenant/rsks/databases/rsks_uat/risk_monikererrors";
        assertEquals(name, normalizer.normalize(name));
    }

    @Test
    public void testNoOpForSimpleName() {
        assertEquals("my_dataset", normalizer.normalize("my_dataset"));
    }

    @Test
    public void testNullPassesThrough() {
        assertNull(normalizer.normalize(null));
    }

    @Test
    public void testEmptyPassesThrough() {
        assertEquals("", normalizer.normalize(""));
    }

    // --- Disabled normalizer ---

    @Test
    public void testDisabledPassesThroughUnchanged() {
        String raw = "my/path/table/year=2025/month=01?foo=bar";
        assertEquals(raw, disabled.normalize(raw));
    }

    // --- extractPartitions() ---

    @Test
    public void testExtractHivePartitions() {
        Map<String, String> partitions = normalizer.extractPartitions(
                "hdfs://ns1/databases/rsks_uat/risk_monikererrors/valuationdate=2025-10-31/datasetid=IDS16958/datasetversion=4");

        assertEquals(3, partitions.size());
        assertEquals("2025-10-31", partitions.get("valuationdate"));
        assertEquals("IDS16958", partitions.get("datasetid"));
        assertEquals("4", partitions.get("datasetversion"));
    }

    @Test
    public void testExtractQueryStringParams() {
        Map<String, String> partitions = normalizer.extractPartitions(
                "hdfs://ns1/table?foo=bar&baz=123");

        assertEquals(2, partitions.size());
        assertEquals("bar", partitions.get("foo"));
        assertEquals("123", partitions.get("baz"));
    }

    @Test
    public void testExtractBothQueryAndHivePartitions() {
        Map<String, String> partitions = normalizer.extractPartitions(
                "my/table/year=2025?env=prod");

        assertEquals(2, partitions.size());
        assertEquals("2025", partitions.get("year"));
        assertEquals("prod", partitions.get("env"));
    }

    @Test
    public void testExtractEmptyWhenNoPartitions() {
        Map<String, String> partitions = normalizer.extractPartitions(
                "hdfs://ns1/databases/my_table");

        assertTrue(partitions.isEmpty());
    }

    @Test
    public void testExtractEmptyWhenDisabled() {
        Map<String, String> partitions = disabled.extractPartitions(
                "my/table/year=2025");

        assertTrue(partitions.isEmpty());
    }

    @Test
    public void testExtractNullReturnsEmpty() {
        assertTrue(normalizer.extractPartitions(null).isEmpty());
    }
}
