package com.openlineage.server.api.models;

import java.time.ZonedDateTime;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record SearchResult(
        String type,
        String name,
        String namespace,
        ZonedDateTime updatedAt,
        String description) {
    public static SearchResult job(String name, String namespace, ZonedDateTime updatedAt, String description) {
        return new SearchResult("JOB", name, namespace, updatedAt, description);
    }

    public static SearchResult dataset(String name, String namespace, ZonedDateTime updatedAt, String description) {
        return new SearchResult("DATASET", name, namespace, updatedAt, description);
    }
}
