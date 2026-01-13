package com.openlineage.server.api.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.ZonedDateTime;
import java.util.List;

public record SourceResponse(
        @JsonProperty("type") String type,
        @JsonProperty("name") String name,
        @JsonProperty("createdAt") ZonedDateTime createdAt,
        @JsonProperty("updatedAt") ZonedDateTime updatedAt,
        @JsonProperty("connectionUrl") String connectionUrl, // URI mapped to String
        @JsonProperty("description") String description) {
    public record SourcesResponse(@JsonProperty("sources") List<SourceResponse> sources) {
    }
}
