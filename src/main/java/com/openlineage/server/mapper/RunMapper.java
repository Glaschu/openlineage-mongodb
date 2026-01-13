package com.openlineage.server.mapper;

import com.openlineage.server.api.models.RunResponse;
import com.openlineage.server.storage.document.RunDocument;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class RunMapper {

    private final DatasetMapper datasetMapper;

    public RunMapper(DatasetMapper datasetMapper) {
        this.datasetMapper = datasetMapper;
    }

    public RunResponse toRunResponse(RunDocument doc) {
        return toRunResponse(doc, false);
    }

    public RunResponse toRunResponse(RunDocument doc, boolean includeDatasets) {
        String state = "RUNNING";
        if (doc.getEventType() != null) {
            String type = doc.getEventType().toUpperCase();
            if ("COMPLETE".equals(type))
                state = "COMPLETED";
            else if ("FAIL".equals(type))
                state = "FAILED";
            else if ("ABORT".equals(type))
                state = "ABORTED";
        }

        Long durationMs = null;
        if (doc.getStartTime() != null && doc.getEndTime() != null) {
            durationMs = java.time.Duration.between(doc.getStartTime(), doc.getEndTime()).toMillis();
        }

        java.time.ZonedDateTime nominalStartTime = null;
        java.time.ZonedDateTime nominalEndTime = null;

        if (doc.getRunFacets() != null && doc.getRunFacets().containsKey("nominalTime")) {
            com.openlineage.server.domain.Facet facet = doc.getRunFacets().get("nominalTime");
            if (facet instanceof com.openlineage.server.domain.GenericFacet) {
                Map<String, Object> props = ((com.openlineage.server.domain.GenericFacet) facet)
                        .getAdditionalProperties();
                if (props.containsKey("nominalStartTime")) {
                    nominalStartTime = java.time.ZonedDateTime.parse((String) props.get("nominalStartTime"));
                }
                if (props.containsKey("nominalEndTime")) {
                    nominalEndTime = java.time.ZonedDateTime.parse((String) props.get("nominalEndTime"));
                }
            }
        }

        return new RunResponse(
                doc.getRunId(),
                doc.getCreatedAt(),
                doc.getUpdatedAt(),
                nominalStartTime, nominalEndTime,
                state,
                doc.getStartTime(),
                doc.getEndTime(),
                durationMs,
                includeDatasets ? mapDatasets(doc.getInputs(), doc, false) : Collections.emptyList(),
                includeDatasets ? mapDatasets(doc.getOutputs(), doc, true) : Collections.emptyList(),
                includeDatasets ? mapDatasetVersions(doc.getInputs(), doc, false) : Collections.emptyList(),
                includeDatasets ? mapDatasetVersionsOutput(doc.getOutputs(), doc) : Collections.emptyList(),

                getRunArgs(doc.getRunFacets()),
                (Map<String, Object>) (Map) doc.getRunFacets(),
                new RunResponse.JobVersion(doc.getJob().getNamespace(),
                        doc.getJob().getName(), "latest"));
    }

    private List<RunResponse.InputDatasetVersion> mapDatasetVersions(
            java.util.Collection<com.openlineage.server.domain.Dataset> datasets, RunDocument run, boolean isOutput) {
        if (datasets == null)
            return Collections.emptyList();

        // InputDatasetVersion and OutputDatasetVersion have same structure, casting to
        // InputDatasetVersion for simplicity/shared logic if possible,
        // but java type system might complain. Let's handle separately or cast safely.

        return datasets.stream()
                .map(ds -> {
                    String version = "";
                    if (ds.facets() != null && ds.facets().containsKey("version")) {
                        com.openlineage.server.domain.Facet facet = ds.facets().get("version");
                        if (facet instanceof com.openlineage.server.domain.GenericFacet) {
                            Object val = ((com.openlineage.server.domain.GenericFacet) facet).getAdditionalProperties()
                                    .get("datasetVersion");
                            if (val != null) {
                                version = val.toString();
                            }
                        }
                    }

                    RunResponse.DatasetVersionId id = new RunResponse.DatasetVersionId(ds.namespace(), ds.name(),
                            version);
                    return new RunResponse.InputDatasetVersion(id, (Map<String, Object>) (Map) ds.facets());
                })
                .collect(Collectors.toList());
    }

    // Quick duplicate for OutputDatasetVersion to avoid type issues, optimized for
    // now
    private List<RunResponse.OutputDatasetVersion> mapDatasetVersionsOutput(
            java.util.Collection<com.openlineage.server.domain.Dataset> datasets, RunDocument run) {
        if (datasets == null)
            return Collections.emptyList();
        return datasets.stream().map(ds -> {
            String version = "";
            if (ds.facets() != null && ds.facets().containsKey("version")) {
                com.openlineage.server.domain.Facet facet = ds.facets().get("version");
                if (facet instanceof com.openlineage.server.domain.GenericFacet) {
                    Object val = ((com.openlineage.server.domain.GenericFacet) facet).getAdditionalProperties()
                            .get("datasetVersion");
                    if (val != null)
                        version = val.toString();
                }
            }
            RunResponse.DatasetVersionId id = new RunResponse.DatasetVersionId(ds.namespace(), ds.name(), version);
            return new RunResponse.OutputDatasetVersion(id, (Map<String, Object>) (Map) ds.facets());
        }).collect(Collectors.toList());
    }

    private List<com.openlineage.server.api.models.DatasetResponse> mapDatasets(
            java.util.Collection<com.openlineage.server.domain.Dataset> datasets, RunDocument run, boolean isOutput) {
        if (datasets == null)
            return Collections.emptyList();
        return datasets.stream()
                .map(ds -> datasetMapper.toResponse(ds, run, isOutput))
                .collect(Collectors.toList());
    }

    private Map<String, String> getRunArgs(Map<String, com.openlineage.server.domain.Facet> facets) {
        if (facets == null || !facets.containsKey("runArgs")) {
            return Collections.emptyMap();
        }
        com.openlineage.server.domain.Facet facet = facets.get("runArgs");
        if (facet instanceof com.openlineage.server.domain.GenericFacet) {
            Map<String, Object> props = ((com.openlineage.server.domain.GenericFacet) facet).getAdditionalProperties();
            return props.entrySet().stream()
                    .collect(Collectors.toMap(Map.Entry::getKey,
                            e -> e.getValue() == null ? "" : e.getValue().toString()));
        }
        return Collections.emptyMap();
    }
}
