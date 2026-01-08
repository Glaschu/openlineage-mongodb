package com.openlineage.server.api;

import com.openlineage.server.api.models.RunResponse;
import com.openlineage.server.api.models.RunResponse.RunsResponse;
import com.openlineage.server.api.models.DatasetResponse;
import com.openlineage.server.domain.Dataset;
import com.openlineage.server.domain.Facet;
import com.openlineage.server.domain.SchemaDatasetFacet;
import com.openlineage.server.domain.RunEvent;

import com.openlineage.server.storage.RunRepository;
import com.openlineage.server.storage.RunDocument;
import com.openlineage.server.service.LineageService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
public class RunController {

    private final RunRepository repository;
    private final LineageService lineageService;
    private final com.openlineage.server.storage.DatasetRepository datasetRepository;

    public RunController(RunRepository repository, LineageService lineageService,
            com.openlineage.server.storage.DatasetRepository datasetRepository) {
        this.repository = repository;
        this.lineageService = lineageService;
        this.datasetRepository = datasetRepository;
    }

    // List runs for a job
    @GetMapping("/namespaces/{namespace}/jobs/{jobName}/runs")
    public RunsResponse listRunsForJob(@PathVariable String namespace, @PathVariable String jobName) {
        List<RunDocument> runDocs = repository.findByJobNamespaceAndJobNameOrderByEventTimeDesc(namespace, jobName);

        List<RunResponse> runs = runDocs.stream()
                .map(this::toRunResponse)
                .collect(Collectors.toList());

        return new RunsResponse(runs, runs.size());
    }

    // Get run by ID
    @GetMapping("/runs/{runId}")
    public RunResponse getRun(@PathVariable String runId) {
        return repository.findById(runId)
                .map(this::toRunResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Run not found"));
    }

    @GetMapping("/jobs/runs/{runId}/facets")
    public Map<String, Object> getRunFacets(@PathVariable String runId) {
        return repository.findById(runId)
                .map(doc -> (Map<String, Object>) (Map) doc.getRunFacets())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Run not found"));
    }

    // Lifecycle: Start
    @PostMapping("/jobs/runs/{runId}/start")
    @ResponseStatus(HttpStatus.OK)
    public void startRun(@PathVariable String runId) {
        createLifecycleEvent(runId, "START");
    }

    @PostMapping("/jobs/runs/{runId}/complete")
    @ResponseStatus(HttpStatus.OK)
    public void completeRun(@PathVariable String runId) {
        createLifecycleEvent(runId, "COMPLETE");
    }

    @PostMapping("/jobs/runs/{runId}/fail")
    @ResponseStatus(HttpStatus.OK)
    public void failRun(@PathVariable String runId) {
        createLifecycleEvent(runId, "FAIL");
    }

    @PostMapping("/jobs/runs/{runId}/abort")
    @ResponseStatus(HttpStatus.OK)
    public void abortRun(@PathVariable String runId) {
        createLifecycleEvent(runId, "ABORT");
    }

    // Helper to create events for manual triggers.
    // Uses existing run context if available, otherwise minimal.
    private void createLifecycleEvent(String runId, String eventType) {
        RunDocument existing = repository.findById(runId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Run context not found."));

        RunEvent newEvent = new RunEvent(
                eventType,
                ZonedDateTime.now(),
                new RunEvent.Run(runId, (java.util.Map<String, Object>) (java.util.Map) existing.getRunFacets()),
                new com.openlineage.server.domain.Job(existing.getJob().getNamespace(), existing.getJob().getName(),
                        null),
                existing.getInputs(),
                existing.getOutputs(),
                "openlineage-server-api",
                null);

        lineageService.ingestEvent(newEvent);
    }

    private RunResponse toRunResponse(RunDocument doc) {
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
                durationMs, // duration
                mapDatasets(doc.getInputs(), doc, false),
                mapDatasets(doc.getOutputs(), doc, true),
                Collections.emptyMap(),
                (java.util.Map<String, Object>) (java.util.Map) doc.getRunFacets(),
                new RunResponse.JobVersion(doc.getJob().getNamespace(), doc.getJob().getName(), "latest"));
    }

    private List<DatasetResponse> mapDatasets(Collection<Dataset> datasets, RunDocument run, boolean isOutput) {
        if (datasets == null)
            return Collections.emptyList();
        return datasets.stream().map(ds -> toDatasetResponse(ds, run, isOutput)).collect(Collectors.toList());
    }

    private DatasetResponse toDatasetResponse(Dataset ds, RunDocument run, boolean isOutput) {
        List<Object> fields = Collections.emptyList();
        if (ds.facets() != null && ds.facets().containsKey("schema")) {
            Facet schemaFacet = ds.facets().get("schema");
            if (schemaFacet instanceof SchemaDatasetFacet) {
                fields = ((SchemaDatasetFacet) schemaFacet).fields().stream()
                        .map(f -> (Object) f)
                        .collect(Collectors.toList());
            }
        }

        String lifecycleState = null;
        if (ds.facets() != null && ds.facets().containsKey("lifecycleStateChange")) {
            Facet facet = ds.facets().get("lifecycleStateChange");
            // Assuming generic map access or specific type if available, using generic for
            // now safely
            if (facet instanceof com.openlineage.server.domain.GenericFacet) {
                Object val = ((com.openlineage.server.domain.GenericFacet) facet).getAdditionalProperties()
                        .get("lifecycleStateChange");
                if (val != null)
                    lifecycleState = val.toString();
            }
        }

        ZonedDateTime updatedAt = isOutput ? run.getEventTime() : null;
        RunResponse createdBy = isOutput
                ? new RunResponse(run.getRunId(), run.getCreatedAt(), run.getUpdatedAt(), null, null, null, null, null,
                        null, Collections.emptyList(), Collections.emptyList(), Collections.emptyMap(),
                        Collections.emptyMap(), null)
                : null;

        ZonedDateTime createdAt = null;
        try {
            java.util.Optional<com.openlineage.server.storage.DatasetDocument> dsDoc = datasetRepository.findById(
                    new com.openlineage.server.storage.MarquezId(ds.namespace(), ds.name()));
            if (dsDoc.isPresent()) {
                createdAt = dsDoc.get().getCreatedAt();
            }
        } catch (Exception e) {
            // Ignore lookup failures
        }

        return new DatasetResponse(
                new DatasetResponse.DatasetId(ds.namespace(), ds.name()),
                "DB_TABLE",
                ds.name(),
                ds.name(),
                createdAt, // createdAt - lookup from registry
                updatedAt,
                ds.namespace(),
                ds.namespace(),
                fields,
                Collections.emptySet(),
                null,
                null,
                mapColumnLineage(ds.facets()),
                (Map<String, Facet>) ds.facets(),
                "", // version
                createdBy,
                lifecycleState);
    }

    private List<DatasetResponse.ColumnLineage> mapColumnLineage(Map<String, Facet> facets) {
        if (facets == null || !facets.containsKey("columnLineage")) {
            return Collections.emptyList();
        }
        Facet facet = facets.get("columnLineage");
        if (facet instanceof com.openlineage.server.domain.ColumnLineageDatasetFacet) {
            return ((com.openlineage.server.domain.ColumnLineageDatasetFacet) facet).fields().entrySet().stream()
                    .map(e -> new DatasetResponse.ColumnLineage(
                            e.getKey(),
                            e.getValue().inputFields(),
                            e.getValue().transformationDescription(),
                            e.getValue().transformationType()))
                    .collect(Collectors.toList());
        }
        return Collections.emptyList();
    }
}
