package com.openlineage.server.api;

import com.openlineage.server.storage.document.JobDocument;
import com.openlineage.server.storage.repository.JobRepository;
import com.openlineage.server.storage.document.MarquezId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v2")
public class JobController {

    private final JobRepository repository;
    private final com.openlineage.server.storage.repository.RunRepository runRepository;
    private final com.openlineage.server.storage.repository.TagRepository tagRepository;
    private final com.openlineage.server.mapper.JobMapper jobMapper;
    private final MongoTemplate mongoTemplate;

    public JobController(JobRepository repository,
            com.openlineage.server.storage.repository.RunRepository runRepository,
            com.openlineage.server.storage.repository.TagRepository tagRepository,
            com.openlineage.server.mapper.JobMapper jobMapper,
            MongoTemplate mongoTemplate) {
        this.repository = repository;
        this.runRepository = runRepository;
        this.tagRepository = tagRepository;
        this.jobMapper = jobMapper;
        this.mongoTemplate = mongoTemplate;
    }

    @GetMapping("/jobs")
    public com.openlineage.server.api.models.JobResponse.JobsResponse listAllJobs(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(required = false, defaultValue = "false") boolean rootOnly,
            @RequestParam(required = false) String parentJobName,
            @RequestParam(required = false, defaultValue = "false") boolean hasLineage) {

        if (limit <= 0) limit = 10;
        
        Query query = new Query();
        if (parentJobName != null) {
            query.addCriteria(Criteria.where("parentJobName").is(parentJobName));
        } else if (rootOnly) {
            query.addCriteria(Criteria.where("parentJobName").isNull());
        }
        
        if (hasLineage) {
            query.addCriteria(new Criteria().orOperator(
                Criteria.where("inputs.0").exists(true),
                Criteria.where("outputs.0").exists(true)
            ));
        }

        long totalCount = mongoTemplate.count(query, JobDocument.class);
        
        query.with(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "updatedAt"));
        query.skip(offset).limit(limit);

        List<JobDocument> page = mongoTemplate.find(query, JobDocument.class);

        List<com.openlineage.server.api.models.JobResponse> jobs = page.stream()
                .map(this::mapJob)
                .collect(java.util.stream.Collectors.toList());

        return new com.openlineage.server.api.models.JobResponse.JobsResponse(jobs, (int) totalCount);
    }

    @GetMapping("/namespaces/{namespace}/jobs")
    public com.openlineage.server.api.models.JobResponse.JobsResponse listJobs(
            @PathVariable String namespace,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(required = false, defaultValue = "false") boolean rootOnly,
            @RequestParam(required = false) String parentJobName,
            @RequestParam(required = false, defaultValue = "false") boolean hasLineage) {

        if (limit <= 0) limit = 10;

        Query query = new Query();
        query.addCriteria(Criteria.where("_id.namespace").is(namespace));
        
        if (parentJobName != null) {
            query.addCriteria(Criteria.where("parentJobName").is(parentJobName));
        } else if (rootOnly) {
            query.addCriteria(Criteria.where("parentJobName").isNull());
        }

        if (hasLineage) {
            query.addCriteria(new Criteria().orOperator(
                Criteria.where("inputs.0").exists(true),
                Criteria.where("outputs.0").exists(true)
            ));
        }

        long totalCount = mongoTemplate.count(query, JobDocument.class);

        query.with(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "updatedAt"));
        query.skip(offset).limit(limit);

        List<JobDocument> page = mongoTemplate.find(query, JobDocument.class);

        List<com.openlineage.server.api.models.JobResponse> jobs = page.stream()
                .map(this::mapJob)
                .collect(java.util.stream.Collectors.toList());

        return new com.openlineage.server.api.models.JobResponse.JobsResponse(jobs, (int) totalCount);
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

    @PostMapping("/namespaces/{namespace}/jobs/{jobName}/tags/{tag}")
    @ResponseStatus(HttpStatus.CREATED)
    public com.openlineage.server.api.models.JobResponse addTag(@PathVariable String namespace,
            @PathVariable String jobName, @PathVariable String tag) {
        JobDocument doc = repository.findById(new MarquezId(namespace, jobName))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        // Initialize tags if null
        if (doc.getTags() == null) {
            doc.setTags(new java.util.HashSet<>());
        }
        doc.getTags().add(tag);
        doc.setUpdatedAt(java.time.ZonedDateTime.now());

        if (!tagRepository.existsById(tag)) {
            tagRepository.save(new com.openlineage.server.storage.document.TagDocument(tag, null, java.time.ZonedDateTime.now()));
        }

        return mapJob(repository.save(doc));
    }

    @DeleteMapping("/namespaces/{namespace}/jobs/{jobName}/tags/{tag}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTag(@PathVariable String namespace, @PathVariable String jobName, @PathVariable String tag) {
        JobDocument doc = repository.findById(new MarquezId(namespace, jobName))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        if (doc.getTags() != null && doc.getTags().remove(tag)) {
            doc.setUpdatedAt(java.time.ZonedDateTime.now());
            repository.save(doc);
        }
    }

    private com.openlineage.server.api.models.JobResponse mapJob(JobDocument doc) {
        // Use paginated query — only fetch the 10 most recent runs from MongoDB, not
        // the entire collection
        org.springframework.data.domain.Slice<com.openlineage.server.storage.document.RunDocument> runsSlice = runRepository
                .findByJobNamespaceAndJobName(
                        doc.getId().getNamespace(), doc.getId().getName(),
                        org.springframework.data.domain.PageRequest.of(0, 10,
                                org.springframework.data.domain.Sort.by("eventTime").descending()));
        return jobMapper.toResponse(doc, runsSlice.getContent());
    }
}
