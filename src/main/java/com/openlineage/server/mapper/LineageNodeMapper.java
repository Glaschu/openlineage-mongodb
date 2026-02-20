package com.openlineage.server.mapper;

import com.openlineage.server.api.models.LineageResponse.DatasetData;
import com.openlineage.server.api.models.LineageResponse.DatasetFieldData;
import com.openlineage.server.api.models.LineageResponse.JobData;
import com.openlineage.server.api.models.RunResponse;
import com.openlineage.server.domain.Facet;
import com.openlineage.server.domain.SchemaDatasetFacet;
import com.openlineage.server.storage.document.DatasetDocument;
import com.openlineage.server.storage.document.JobDocument;
import com.openlineage.server.storage.document.MarquezId;
import com.openlineage.server.storage.document.RunDocument;
import com.openlineage.server.storage.repository.RunRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class LineageNodeMapper {

    private final RunRepository runRepository;
    private final RunMapper runMapper;

    public LineageNodeMapper(RunRepository runRepository, RunMapper runMapper) {
        this.runRepository = runRepository;
        this.runMapper = runMapper;
    }

    public JobData mapJob(JobDocument job) {
        // Look up the latest run for this job
        RunResponse latestRun = null;
        String state = null;
        String currentRunId = null;
        Long durationMs = null;

        List<RunDocument> latestRuns = runRepository.findByJobNamespaceAndJobName(
                job.getId().getNamespace(), job.getId().getName(),
                PageRequest.of(0, 1, Sort.by("eventTime").descending()))
                .getContent();

        if (!latestRuns.isEmpty()) {
            RunDocument latest = latestRuns.get(0);
            latestRun = runMapper.toRunResponse(latest);
            state = latestRun.state();
            currentRunId = latest.getRunId();
            durationMs = latestRun.durationMs();
        }

        return new JobData(
                job.getId().getName(), "JOB", job.getId().getName(), job.getId().getName(),
                job.getCreatedAt() != null ? job.getCreatedAt() : job.getUpdatedAt(),
                job.getUpdatedAt(), job.getId().getNamespace(),
                toStringSet(job.getInputs()), toStringSet(job.getInputs()),
                toStringSet(job.getOutputs()), toStringSet(job.getOutputs()),
                job.getLocation(), job.getDescription(), job.getFacets(),
                latestRun, state, currentRunId,
                job.getParentJobName(), durationMs);
    }

    public DatasetData mapDataset(DatasetDocument ds, Map<String, Facet> mergedFacets) {
        return new DatasetData(
                ds.getId().getName(), "DB_TABLE", ds.getId().getName(), ds.getId().getName(),
                ds.getUpdatedAt(), ds.getUpdatedAt(), ds.getId().getNamespace(),
                ds.getSourceName(), ds.getFields() == null ? Collections.emptyList() : ds.getFields(), ds.getTags(),
                ds.getUpdatedAt(), ds.getDescription(), mergedFacets);
    }

    public List<DatasetFieldData> mapSchemaToFields(DatasetData dsData) {
        if (dsData.facets() != null && dsData.facets().containsKey("schema")) {
            Facet schemaFacet = dsData.facets().get("schema");
            if (schemaFacet instanceof SchemaDatasetFacet) {
                List<SchemaDatasetFacet.SchemaField> fields = ((SchemaDatasetFacet) schemaFacet).fields();
                if (fields != null) {
                    return fields.stream().map(field -> new DatasetFieldData(
                            dsData.namespace(), dsData.name(), field.name(), field.name(), "column",
                            field.type())).collect(Collectors.toList());
                }
            }
        }
        return Collections.emptyList();
    }

    private Set<String> toStringSet(Set<MarquezId> ids) {
        if (ids == null)
            return Collections.emptySet();
        return ids.stream().map(id -> "dataset:" + id.getNamespace() + ":" + id.getName())
                .collect(Collectors.toSet());
    }
}
