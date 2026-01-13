package com.openlineage.server.api.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.openlineage.server.domain.Facet;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

public record DatasetResponse(
        @JsonProperty("id") DatasetId id,
        @JsonProperty("type") String type,
        @JsonProperty("name") String name,
        @JsonProperty("physicalName") String physicalName,
        @JsonProperty("createdAt") ZonedDateTime createdAt,
        @JsonProperty("updatedAt") ZonedDateTime updatedAt,
        @JsonProperty("namespace") String namespace,
        @JsonProperty("sourceName") String sourceName,
        @JsonProperty("fields") List<Object> fields, // Keeping generic for now
        @JsonProperty("tags") Set<String> tags,
        @JsonProperty("lastModifiedAt") ZonedDateTime lastModifiedAt,
        @JsonProperty("description") String description,
        @JsonProperty("columnLineage") List<ColumnLineage> columnLineage,
        @JsonProperty("facets") Map<String, Facet> facets,
        @JsonProperty("version") String version,
        @JsonProperty("createdByRun") RunResponse createdByRun,
        @JsonProperty("lifecycleState") String lifecycleState,
        @JsonProperty("isDeleted") Boolean isDeleted,
        @JsonProperty("currentVersion") java.util.UUID currentVersion) {
    public record ColumnLineage(
            String name,
            List<com.openlineage.server.domain.ColumnLineageDatasetFacet.InputField> inputFields,
            String transformationDescription,
            String transformationType) {
    }

    public record DatasetId(String namespace, String name) {
    }

    public record DatasetsResponse(@JsonProperty("datasets") List<DatasetResponse> datasets,
            @JsonProperty("totalCount") int totalCount) {
    }

    public record DatasetVersionsResponse(@JsonProperty("versions") List<DatasetResponse> versions,
            @JsonProperty("totalCount") int totalCount) {
    }
}
