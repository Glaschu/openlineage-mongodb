package com.openlineage.server.api;

import com.openlineage.server.api.models.RunResponse;
import com.openlineage.server.api.models.RunResponse.RunsResponse;
import com.openlineage.server.api.models.DatasetResponse;
import com.openlineage.server.domain.Dataset;
import com.openlineage.server.domain.Facet;
import com.openlineage.server.domain.SchemaDatasetFacet;
import com.openlineage.server.domain.RunEvent;

import com.openlineage.server.storage.repository.RunRepository;
import com.openlineage.server.storage.document.RunDocument;
import com.openlineage.server.storage.document.JobDocument;
import com.openlineage.server.storage.repository.JobRepository;
import com.openlineage.server.storage.document.MarquezId;
import com.openlineage.server.service.LineageService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v2")
public class RunController {

    private final RunRepository repository;
    private final JobRepository jobRepository;
    private final LineageService lineageService;
    private final com.openlineage.server.mapper.RunMapper runMapper;

    public RunController(RunRepository repository, JobRepository jobRepository, LineageService lineageService,
            com.openlineage.server.mapper.RunMapper runMapper) {
        this.repository = repository;
        this.jobRepository = jobRepository;
        this.lineageService = lineageService;
        this.runMapper = runMapper;
    }

    // List runs for a job
    @GetMapping("/namespaces/{namespace}/jobs/{jobName}/runs")
    public RunsResponse listRunsForJob(@PathVariable String namespace, @PathVariable String jobName,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {

        if (limit <= 0)
            limit = 20;
        if (limit > 200)
            limit = 200;

        org.springframework.data.domain.Pageable pageRequest = org.springframework.data.domain.PageRequest
                .of(offset / limit, limit, org.springframework.data.domain.Sort.by("eventTime").descending());
        org.springframework.data.domain.Slice<RunDocument> slice = repository.findByJobNamespaceAndJobName(namespace,
                jobName, pageRequest);

        List<RunResponse> runs = slice.getContent().stream()
                .map(doc -> runMapper.toRunResponse(doc, true))
                .collect(Collectors.toList());

        // Slice avoids costly count query; estimate total for pagination
        int totalEstimate = slice.hasNext() ? offset + limit + 1 : offset + runs.size();
        return new RunsResponse(runs, totalEstimate);
    }

    // Get run by ID
    @GetMapping("/runs/{runId}")
    public RunResponse getRun(@PathVariable String runId) {
        return repository.findById(runId)
                .map(doc -> runMapper.toRunResponse(doc, true))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Run not found"));
    }

    @GetMapping("/jobs/runs/{runId}/facets")
    public Map<String, Object> getRunFacets(@PathVariable String runId,
            @RequestParam(required = false) String type) {
        RunDocument run = repository.findById(runId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Run not found"));

        if ("job".equalsIgnoreCase(type)) {
            JobDocument job = jobRepository.findById(run.getJob())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));

            Map<String, Object> response = new HashMap<>();
            response.put("runId", runId);
            response.put("facets", job.getFacets());
            return response;
        }

        return (Map<String, Object>) (Map) run.getRunFacets();
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
}
