package com.openlineage.server.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Normalizes dataset names by stripping query parameters and Hive-style
 * partition segments ({@code /key=value}) so that logically identical datasets
 * are not stored as separate documents.
 *
 * <p>
 * Also provides {@link #extractPartitions(String)} to retrieve the stripped
 * partition key-value pairs for storage as a dataset facet.
 * </p>
 *
 * <p>
 * Enabled by default. Set {@code openlineage.dataset.normalize-names=false}
 * in application.yml to disable.
 * </p>
 */
@Component
public class DatasetNameNormalizer {

    private final boolean enabled;

    public DatasetNameNormalizer(
            @Value("${openlineage.dataset.normalize-names:true}") boolean enabled) {
        this.enabled = enabled;
    }

    /**
     * Normalizes a dataset name by:
     * <ol>
     * <li>Stripping everything after {@code ?} (traditional query strings)</li>
     * <li>Stripping trailing {@code /key=value} path segments (Hive-style
     * partitions)</li>
     * </ol>
     *
     * @param name the raw dataset name from the OpenLineage event
     * @return the normalized name, or the original name if normalization is
     *         disabled
     */
    public String normalize(String name) {
        if (!enabled || name == null || name.isEmpty()) {
            return name;
        }

        // 1. Strip traditional query string (?key=value&...)
        int queryIdx = name.indexOf('?');
        if (queryIdx >= 0) {
            name = name.substring(0, queryIdx);
        }

        // 2. Strip trailing Hive-style partition segments (/key=value)
        while (name.contains("/")) {
            int lastSlash = name.lastIndexOf('/');
            String lastSegment = name.substring(lastSlash + 1);
            if (isPartitionSegment(lastSegment)) {
                name = name.substring(0, lastSlash);
            } else {
                break;
            }
        }

        // Remove any trailing slash left over
        if (name.endsWith("/")) {
            name = name.substring(0, name.length() - 1);
        }

        return name;
    }

    /**
     * Extracts Hive-style partition key-value pairs and query string parameters
     * from a dataset name.
     *
     * @param name the raw dataset name from the OpenLineage event
     * @return a map of partition key → value pairs (empty if none found or
     *         disabled)
     */
    public Map<String, String> extractPartitions(String name) {
        Map<String, String> partitions = new LinkedHashMap<>();
        if (!enabled || name == null || name.isEmpty()) {
            return partitions;
        }

        // 1. Extract query string parameters
        int queryIdx = name.indexOf('?');
        if (queryIdx >= 0) {
            String queryString = name.substring(queryIdx + 1);
            for (String param : queryString.split("&")) {
                int eqIdx = param.indexOf('=');
                if (eqIdx > 0) {
                    partitions.put(param.substring(0, eqIdx), param.substring(eqIdx + 1));
                }
            }
            // Work with the path portion only for Hive partition extraction
            name = name.substring(0, queryIdx);
        }

        // 2. Extract trailing Hive-style partition segments (/key=value)
        while (name.contains("/")) {
            int lastSlash = name.lastIndexOf('/');
            String lastSegment = name.substring(lastSlash + 1);
            if (isPartitionSegment(lastSegment)) {
                int eqIdx = lastSegment.indexOf('=');
                partitions.put(lastSegment.substring(0, eqIdx), lastSegment.substring(eqIdx + 1));
                name = name.substring(0, lastSlash);
            } else {
                break;
            }
        }

        return partitions;
    }

    /**
     * Returns true if the segment matches the Hive partition pattern
     * {@code key=value},
     * where key is a non-empty alphanumeric/underscore string.
     */
    private boolean isPartitionSegment(String segment) {
        if (segment == null || segment.isEmpty()) {
            return false;
        }
        int eqIdx = segment.indexOf('=');
        if (eqIdx <= 0 || eqIdx == segment.length() - 1) {
            return false;
        }
        // Key part must be alphanumeric/underscores only
        String key = segment.substring(0, eqIdx);
        return key.matches("[a-zA-Z_][a-zA-Z0-9_]*");
    }
}
