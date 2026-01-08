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

        return new RunResponse(
                doc.getRunId(),
                doc.getCreatedAt(),
                doc.getUpdatedAt(),
                null, null,
                state,
                doc.getStartTime(),
                doc.getEndTime(),
                durationMs,
                includeDatasets ? mapDatasets(doc.getInputs(), doc, false) : Collections.emptyList(),
                includeDatasets ? mapDatasets(doc.getOutputs(), doc, true) : Collections.emptyList(),
                Collections.emptyMap(),
                (Map<String, Object>) (Map) doc.getRunFacets(),
                new RunResponse.JobVersion(doc.getJob().getNamespace(),
                        doc.getJob().getName(), "latest"));
    }

    private List<com.openlineage.server.api.models.DatasetResponse> mapDatasets(
            java.util.Collection<com.openlineage.server.domain.Dataset> datasets, RunDocument run, boolean isOutput) {
        if (datasets == null)
            return Collections.emptyList();
        return datasets.stream()
                .map(ds -> datasetMapper.toResponse(ds, run, isOutput))
                .collect(Collectors.toList());
    }
}
