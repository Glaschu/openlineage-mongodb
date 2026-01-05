package com.openlineage.server.api.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.openlineage.server.domain.Facet;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

public record RunResponse(
    @JsonProperty("id") String id,
    @JsonProperty("createdAt") ZonedDateTime createdAt,
    @JsonProperty("updatedAt") ZonedDateTime updatedAt,
    @JsonProperty("nominalStartTime") ZonedDateTime nominalStartTime,
    @JsonProperty("nominalEndTime") ZonedDateTime nominalEndTime,
    @JsonProperty("state") String state,
    @JsonProperty("startedAt") ZonedDateTime startedAt,
    @JsonProperty("endedAt") ZonedDateTime endedAt,
    @JsonProperty("durationMs") Long durationMs,
    @JsonProperty("inputs") List<DatasetResponse> inputs,
    @JsonProperty("outputs") List<DatasetResponse> outputs,
    @JsonProperty("args") Map<String, String> args,
    @JsonProperty("facets") Map<String, Object> facets,
    @JsonProperty("jobVersion") JobVersion jobVersion
) {
    public record JobVersion(String namespace, String name, String version) {}
    public record RunsResponse(@JsonProperty("runs") List<RunResponse> runs, @JsonProperty("totalCount") int totalCount) {}
}
