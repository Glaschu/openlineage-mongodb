package com.openlineage.server.api.models;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.openlineage.server.domain.Facet;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

public record LineageResponse(Set<Node> graph) {

    public record Node(
            String id,
            String type,
            NodeData data,
            Set<Edge> inEdges,
            Set<Edge> outEdges) {
    }

    public record Edge(
            String origin,
            String destination) {
    }

    @JsonTypeInfo(use = JsonTypeInfo.Id.DEDUCTION)
    @JsonSubTypes({
            @JsonSubTypes.Type(JobData.class),
            @JsonSubTypes.Type(DatasetData.class),
            @JsonSubTypes.Type(DatasetFieldData.class)
    })
    public interface NodeData {
    }

    public record JobData(
            String id,
            String type,
            String name,
            String simpleName,
            ZonedDateTime createdAt,
            ZonedDateTime updatedAt,
            String namespace,
            Set<String> inputs,
            Set<String> inputUuids,
            Set<String> outputs,
            Set<String> outputUuids,
            String location,
            String description,
            Map<String, Facet> facets,
            @JsonInclude(JsonInclude.Include.NON_NULL) RunResponse latestRun,
            @JsonInclude(JsonInclude.Include.NON_NULL) String state,
            @JsonInclude(JsonInclude.Include.NON_NULL) String currentRunId,
            @JsonInclude(JsonInclude.Include.NON_NULL) String parentJobName,
            @JsonInclude(JsonInclude.Include.NON_NULL) Long durationMs) implements NodeData {
    }

    public record DatasetData(
            String id,
            String type,
            String name,
            String physicalName,
            ZonedDateTime createdAt,
            ZonedDateTime updatedAt,
            String namespace,
            String sourceName,
            List<Object> fields,
            Set<String> tags,
            ZonedDateTime lastModifiedAt,
            String description,
            Map<String, Facet> facets) implements NodeData {
    }

    public record DatasetFieldData(
            String namespace,
            String dataset,
            String column,
            String field,
            String type,
            String fieldType) implements NodeData {
    }
}
