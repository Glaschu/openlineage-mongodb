package com.openlineage.server.api.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class LineageExportModels {

    public record LineageExportResult(
            @JsonProperty("namespaceData") List<NamespaceLineageData> namespaceData) {
    }

    public record NamespaceLineageData(
            @JsonProperty("namespaceUuid") UUID namespaceUuid, // In Mongo we verify if we have UUIDs for namespaces,
                                                               // usually strings
            @JsonProperty("namespaceName") String namespaceName,
            @JsonProperty("jobLineage") List<JobLineageRow> jobLineage,
            @JsonProperty("columnLineage") List<ColumnLineageRow> columnLineage,
            @JsonProperty("jobLineageCount") long jobLineageCount,
            @JsonProperty("columnLineageCount") long columnLineageCount) {
    }

    public record JobLineageRow(
            String sourceDatasetUuid,
            String sourceNamespace,
            String sourceDatasetName,
            String sourcePhysicalName,
            String targetDatasetUuid,
            String targetNamespace,
            String targetDatasetName,
            String targetPhysicalName,
            String jobUuid,
            String jobNamespace,
            String jobName,
            String jobType,
            String jobDescription,
            Instant lastRunTime,
            String lastRunState,
            Instant jobUpdatedAt) {
    }

    public record ColumnLineageRow(
            String sourceDatasetUuid,
            String sourceNamespace,
            String sourceDatasetName,
            String sourceFieldUuid,
            String sourceFieldName,
            String sourceFieldType,
            String targetDatasetUuid,
            String targetNamespace,
            String targetDatasetName,
            String targetFieldUuid,
            String targetFieldName,
            String targetFieldType,
            String transformationType,
            String transformationDescription,
            Instant lineageUpdatedAt) {
    }
}
