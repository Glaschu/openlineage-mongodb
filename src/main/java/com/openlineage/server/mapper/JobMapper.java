package com.openlineage.server.mapper;

import com.openlineage.server.api.models.JobResponse;
import com.openlineage.server.api.models.RunResponse;
import com.openlineage.server.storage.document.JobDocument;
import com.openlineage.server.storage.document.MarquezId;
import com.openlineage.server.storage.document.RunDocument;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class JobMapper {

    private final RunMapper runMapper;

    public JobMapper(RunMapper runMapper) {
        this.runMapper = runMapper;
    }

    public JobResponse toResponse(JobDocument doc, List<RunDocument> latestRuns) {
        RunResponse latestRun = latestRuns.isEmpty() ? null : runMapper.toRunResponse(latestRuns.get(0));
        List<RunResponse> recentRuns = latestRuns.stream()
                .map(runMapper::toRunResponse)
                .collect(Collectors.toList());

        return new JobResponse(
                new JobResponse.JobId(doc.getId().getNamespace(), doc.getId().getName()),
                "JOB", // Type
                doc.getId().getName(),
                doc.getId().getName(), // Simple Name
                doc.getCreatedAt() != null ? doc.getCreatedAt() : doc.getUpdatedAt(), // Use CreatedAt if available
                doc.getUpdatedAt(),
                doc.getId().getNamespace(),
                mapDatasetIds(doc.getInputs()),
                mapDatasetIds(doc.getOutputs()),
                doc.getTags() == null ? Collections.emptySet() : doc.getTags(),
                doc.getLocation(), // location
                doc.getDescription(), // description
                latestRun, // latestRun
                recentRuns, // latestRuns
                doc.getFacets(),
                latestRun != null ? latestRun.state() : null,
                latestRun != null ? latestRun.durationMs() : null);
    }

    private Set<JobResponse.DatasetId> mapDatasetIds(Set<MarquezId> ids) {
        if (ids == null)
            return Collections.emptySet();
        return ids.stream()
                .map(id -> new JobResponse.DatasetId(id.getNamespace(), id.getName()))
                .collect(Collectors.toSet());
    }
}
