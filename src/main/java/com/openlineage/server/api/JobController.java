package com.openlineage.server.api;

import com.openlineage.server.storage.JobDocument;
import com.openlineage.server.storage.JobRepository;
import com.openlineage.server.storage.MarquezId;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class JobController {

    private final JobRepository repository;
    private final com.openlineage.server.storage.LineageEventRepository lineageEventRepository;

    public JobController(JobRepository repository, com.openlineage.server.storage.LineageEventRepository lineageEventRepository) {
        this.repository = repository;
        this.lineageEventRepository = lineageEventRepository;
    }

    @GetMapping("/jobs")
    public com.openlineage.server.api.models.JobResponse.JobsResponse listAllJobs(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        
        // Ensure limit is positive to avoid division by zero
        if (limit <= 0) limit = 10;
        
        org.springframework.data.domain.Pageable pageRequest = org.springframework.data.domain.PageRequest.of(offset / limit, limit, org.springframework.data.domain.Sort.by("updatedAt").descending());
        org.springframework.data.domain.Page<JobDocument> page = repository.findAll(pageRequest);
        
        List<com.openlineage.server.api.models.JobResponse> jobs = page.getContent().stream()
            .map(this::toResponse)
            .collect(java.util.stream.Collectors.toList());
            
        return new com.openlineage.server.api.models.JobResponse.JobsResponse(jobs, (int) page.getTotalElements());
    }

    @GetMapping("/namespaces/{namespace}/jobs")
    public com.openlineage.server.api.models.JobResponse.JobsResponse listJobs(
            @PathVariable String namespace,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        
        if (limit <= 0) limit = 10;

        // Using simple list filter for namespace, simulating pagination since custom repo method for pageable not added yet.
        // Efficient enough for this scale.
        List<JobDocument> allJobs = repository.findByIdNamespace(namespace);
        
        List<com.openlineage.server.api.models.JobResponse> jobs = allJobs.stream()
            .sorted(java.util.Comparator.comparing(JobDocument::getUpdatedAt).reversed())
            .skip(offset)
            .limit(limit)
            .map(this::toResponse)
            .collect(java.util.stream.Collectors.toList());
            
        return new com.openlineage.server.api.models.JobResponse.JobsResponse(jobs, allJobs.size());
    }

    @GetMapping("/namespaces/{namespace}/jobs/{jobName}")
    public com.openlineage.server.api.models.JobResponse getJob(@PathVariable String namespace, @PathVariable String jobName) {
        return repository.findById(new MarquezId(namespace, jobName))
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
    }

    @PutMapping("/namespaces/{namespace}/jobs/{jobName}")
    public com.openlineage.server.api.models.JobResponse updateJob(@PathVariable String namespace, @PathVariable String jobName, @RequestBody JobDocument doc) {
        doc.setId(new MarquezId(namespace, jobName));
        doc.setUpdatedAt(java.time.ZonedDateTime.now());
        // Ensure createdAt is preserved if existing
        repository.findById(doc.getId()).ifPresent(existing -> doc.setCreatedAt(existing.getCreatedAt()));
        if (doc.getCreatedAt() == null) doc.setCreatedAt(java.time.ZonedDateTime.now());
        
        return toResponse(repository.save(doc));
    }

    @DeleteMapping("/namespaces/{namespace}/jobs/{jobName}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteJob(@PathVariable String namespace, @PathVariable String jobName) {
        MarquezId id = new MarquezId(namespace, jobName);
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found");
        }
        repository.deleteById(id);
    }

    private com.openlineage.server.api.models.JobResponse toResponse(JobDocument doc) {
        return new com.openlineage.server.api.models.JobResponse(
            new com.openlineage.server.api.models.JobResponse.JobId(doc.getId().getNamespace(), doc.getId().getName()),
            "JOB", // Type
            doc.getId().getName(),
            doc.getId().getName(), // Simple Name
            doc.getCreatedAt() != null ? doc.getCreatedAt() : doc.getUpdatedAt(), // Use CreatedAt if available
            doc.getUpdatedAt(),
            doc.getId().getNamespace(),
            mapDatasetIds(doc.getInputs()),
            mapDatasetIds(doc.getOutputs()),
            doc.getTags() == null ? java.util.Collections.emptySet() : doc.getTags(),
            doc.getLocation(), // location
            doc.getDescription(), // description
            getLatestRun(doc.getId().getNamespace(), doc.getId().getName()), // latestRun
            getLatestRuns(doc.getId().getNamespace(), doc.getId().getName()), // latestRuns
            doc.getFacets()
        );
    }

    private com.openlineage.server.api.models.RunResponse getLatestRun(String namespace, String name) {
        List<com.openlineage.server.api.models.RunResponse> runs = getLatestRuns(namespace, name);
        return runs.isEmpty() ? null : runs.get(0);
    }

    private List<com.openlineage.server.api.models.RunResponse> getLatestRuns(String namespace, String name) {
        // This is inefficient N+1, but needed for UI. Ideally optimized implementation.
        // Re-using logic from RunController is hard without public method. 
        // For now, doing simple fetch.
        // We really should use the RunController or Service.
        // Duplicating simple logic for now.
        List<com.openlineage.server.storage.LineageEventDocument> events = lineageEventRepository.findByEventJobNamespaceAndEventJobName(namespace, name);
        if (events.isEmpty()) return java.util.Collections.emptyList();
        
        // Naive aggregation: group by runId, sort by time desc
        java.util.Map<String, List<com.openlineage.server.storage.LineageEventDocument>> eventsByRunId = events.stream()
                .collect(java.util.stream.Collectors.groupingBy(d -> d.getEvent().run().runId()));

        return eventsByRunId.values().stream()
                .map(this::aggregateRunEvents)
                .sorted(java.util.Comparator.comparing(com.openlineage.server.api.models.RunResponse::createdAt).reversed())
                .limit(10)
                .collect(java.util.stream.Collectors.toList());
    }

    // Duplicated from RunController (shameful but necessary for quick fix without extraction)
    private com.openlineage.server.api.models.RunResponse aggregateRunEvents(List<com.openlineage.server.storage.LineageEventDocument> docs) {
         docs.sort(java.util.Comparator.comparing(d -> d.getEvent().eventTime()));
         com.openlineage.server.storage.LineageEventDocument first = docs.get(0);
         com.openlineage.server.storage.LineageEventDocument last = docs.get(docs.size() - 1);
         
         String state = "RUNNING";
         java.time.ZonedDateTime startedAt = null;
         java.time.ZonedDateTime endedAt = null;
         
         for (com.openlineage.server.storage.LineageEventDocument doc : docs) {
            String type = doc.getEvent().eventType().toUpperCase();
            if ("START".equals(type)) startedAt = doc.getEvent().eventTime();
            if ("COMPLETE".equals(type)) { state = "COMPLETED"; endedAt = doc.getEvent().eventTime(); }
            if ("FAIL".equals(type)) { state = "FAILED"; endedAt = doc.getEvent().eventTime(); }
            if ("ABORT".equals(type)) { state = "ABORTED"; endedAt = doc.getEvent().eventTime(); }
         }
         
         return new com.openlineage.server.api.models.RunResponse(
            first.getEvent().run().runId(),
            first.getEvent().eventTime(),
            last.getEvent().eventTime(),
            null, null, state, startedAt, endedAt, null,
            java.util.Collections.emptyList(), // Simplified for Job list view
            java.util.Collections.emptyList(),
            java.util.Collections.emptyMap(),
            (java.util.Map<String, Object>)(java.util.Map) last.getEvent().run().facets(),
            new com.openlineage.server.api.models.RunResponse.JobVersion(first.getEvent().job().namespace(), first.getEvent().job().name(), "latest")
         );
    }
    
    private java.util.Set<com.openlineage.server.api.models.JobResponse.DatasetId> mapDatasetIds(java.util.Set<MarquezId> ids) {
        if (ids == null) return java.util.Collections.emptySet();
        return ids.stream()
            .map(id -> new com.openlineage.server.api.models.JobResponse.DatasetId(id.getNamespace(), id.getName()))
            .collect(java.util.stream.Collectors.toSet());
    }
}
