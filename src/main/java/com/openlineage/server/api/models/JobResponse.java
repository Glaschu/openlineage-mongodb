package com.openlineage.server.api.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.openlineage.server.domain.Facet;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

public record JobResponse(
        @JsonProperty("id") JobId id,
        @JsonProperty("type") String type,
        @JsonProperty("name") String name,
        @JsonProperty("simpleName") String simpleName,
        @JsonProperty("createdAt") ZonedDateTime createdAt,
        @JsonProperty("updatedAt") ZonedDateTime updatedAt,
        @JsonProperty("namespace") String namespace,
        @JsonProperty("inputs") Set<DatasetId> inputs,
        @JsonProperty("outputs") Set<DatasetId> outputs,
        @JsonProperty("tags") Set<String> tags,
        @JsonProperty("location") String location,
        @JsonProperty("description") String description,
        @JsonProperty("latestRun") RunResponse latestRun,
        @JsonProperty("latestRuns") List<RunResponse> latestRuns,
        @JsonProperty("facets") Map<String, Facet> facets,
        @JsonProperty("state") String state,
        @JsonProperty("durationMs") Long durationMs) {
    public record JobId(String namespace, String name) {
    }

    public record DatasetId(String namespace, String name) {
    }

    public record JobsResponse(@JsonProperty("jobs") List<JobResponse> jobs,
            @JsonProperty("totalCount") int totalCount) {
    }
}
