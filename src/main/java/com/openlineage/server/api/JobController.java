package com.openlineage.server.api;

import com.openlineage.server.storage.document.JobDocument;
import com.openlineage.server.storage.repository.JobRepository;
import com.openlineage.server.storage.document.MarquezId;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class JobController {

    private final JobRepository repository;
    private final com.openlineage.server.storage.repository.RunRepository runRepository;
    private final com.openlineage.server.mapper.JobMapper jobMapper;

    public JobController(JobRepository repository,
            com.openlineage.server.storage.repository.RunRepository runRepository,
            com.openlineage.server.mapper.JobMapper jobMapper) {
        this.repository = repository;
        this.runRepository = runRepository;
        this.jobMapper = jobMapper;
    }

    @GetMapping("/jobs")
    public com.openlineage.server.api.models.JobResponse.JobsResponse listAllJobs(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "0") int offset) {

        // Ensure limit is positive to avoid division by zero
        if (limit <= 0)
            limit = 10;

        org.springframework.data.domain.Pageable pageRequest = org.springframework.data.domain.PageRequest
                .of(offset / limit, limit, org.springframework.data.domain.Sort.by("updatedAt").descending());
        org.springframework.data.domain.Page<JobDocument> page = repository.findAll(pageRequest);

        List<com.openlineage.server.api.models.JobResponse> jobs = page.getContent().stream()
                .map(this::mapJob)
                .collect(java.util.stream.Collectors.toList());

        return new com.openlineage.server.api.models.JobResponse.JobsResponse(jobs, (int) page.getTotalElements());
    }

    @GetMapping("/namespaces/{namespace}/jobs")
    public com.openlineage.server.api.models.JobResponse.JobsResponse listJobs(
            @PathVariable String namespace,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "0") int offset) {

        if (limit <= 0)
            limit = 10;

        List<JobDocument> allJobs = repository.findByIdNamespace(namespace);

        List<com.openlineage.server.api.models.JobResponse> jobs = allJobs.stream()
                .sorted(java.util.Comparator.comparing(JobDocument::getUpdatedAt,
                        java.util.Comparator.nullsFirst(java.util.Comparator.naturalOrder())).reversed())
                .skip(offset)
                .limit(limit)
                .map(this::mapJob)
                .collect(java.util.stream.Collectors.toList());

        return new com.openlineage.server.api.models.JobResponse.JobsResponse(jobs, allJobs.size());
    }

    @GetMapping("/namespaces/{namespace}/jobs/{jobName}")
    public com.openlineage.server.api.models.JobResponse getJob(@PathVariable String namespace,
            @PathVariable String jobName) {
        return repository.findById(new MarquezId(namespace, jobName))
                .map(this::mapJob)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
    }

    @PutMapping("/namespaces/{namespace}/jobs/{jobName}")
    public com.openlineage.server.api.models.JobResponse updateJob(@PathVariable String namespace,
            @PathVariable String jobName, @RequestBody JobDocument doc) {
        doc.setId(new MarquezId(namespace, jobName));
        doc.setUpdatedAt(java.time.ZonedDateTime.now());
        // Ensure createdAt is preserved if existing
        repository.findById(doc.getId()).ifPresent(existing -> doc.setCreatedAt(existing.getCreatedAt()));
        if (doc.getCreatedAt() == null)
            doc.setCreatedAt(java.time.ZonedDateTime.now());

        return mapJob(repository.save(doc));
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

    private com.openlineage.server.api.models.JobResponse mapJob(JobDocument doc) {
        List<com.openlineage.server.storage.document.RunDocument> runs = runRepository
                .findByJobNamespaceAndJobNameOrderByEventTimeDesc(doc.getId().getNamespace(), doc.getId().getName())
                .stream()
                .limit(10)
                .collect(java.util.stream.Collectors.toList());
        return jobMapper.toResponse(doc, runs);
    }
}
