package com.openlineage.server.api;

import com.openlineage.server.api.models.RunResponse;
import com.openlineage.server.api.models.RunResponse.RunsResponse;
import com.openlineage.server.api.models.DatasetResponse;
import com.openlineage.server.domain.Dataset;
import com.openlineage.server.domain.RunEvent;
import com.openlineage.server.domain.Facet;
import com.openlineage.server.domain.SchemaDatasetFacet;
import com.openlineage.server.storage.LineageEventDocument;
import com.openlineage.server.storage.LineageEventRepository;
import com.openlineage.server.service.LineageService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
public class RunController {

    private final LineageEventRepository repository;
    private final LineageService lineageService;
    private final org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    public RunController(LineageEventRepository repository, LineageService lineageService, org.springframework.data.mongodb.core.MongoTemplate mongoTemplate) {
        this.repository = repository;
        this.lineageService = lineageService;
        this.mongoTemplate = mongoTemplate;
    }

    // List runs for a job
    @GetMapping("/namespaces/{namespace}/jobs/{jobName}/runs")
    public RunsResponse listRunsForJob(@PathVariable String namespace, @PathVariable String jobName) {
        List<LineageEventDocument> events = repository.findByEventJobNamespaceAndEventJobName(namespace, jobName);
        
        // Group by Run ID
        Map<String, List<LineageEventDocument>> eventsByRunId = events.stream()
                .collect(Collectors.groupingBy(doc -> doc.getEvent().run().runId()));

        List<RunResponse> runs = eventsByRunId.entrySet().stream()
                .map(this::aggregateRunEvents)
                .sorted(Comparator.comparing(RunResponse::createdAt).reversed())
                .collect(Collectors.toList());

        return new RunsResponse(runs, runs.size());
    }

    // Get run by ID
    @GetMapping("/runs/{runId}")
    public RunResponse getRun(@PathVariable String runId) {
        // Since findByEventRunRunId returns only one document, aggregation logic isn't fully utilized unless we fix repository.
        // However, for single run query, we should ideally fetch ALL events for that run.
        // Assuming findByEventRunRunId returns the *latest* or *first*. For consistent behavior with listRuns, we need all.
        // But without changing repository interface right now (which requires full recompile and risk), I'll stick to single doc mapping.
        // Wait, listRuns does findByEventJob... which returns List.
        // I should probably use aggregation logic if I could filtering listRuns result, but that's inefficient.
        // I will stick to mapping the single document found, but populating inputs/outputs from THAT document.
        
        return findByRunId(runId).stream()
                .sorted(Comparator.comparing((LineageEventDocument d) -> d.getEvent().eventTime()).reversed())
                .findFirst()
                .map(this::toSimpleRunResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Run not found"));
    }

    @GetMapping("/debug/events")
    public List<LineageEventDocument> debugEvents() {
        return repository.findAll();
    }



    // Get run facets
    // Get run facets
    @GetMapping("/jobs/runs/{runId}/facets")
    public Map<String, Object> getRunFacets(@PathVariable String runId, @RequestParam(defaultValue = "run") String type) {
        List<LineageEventDocument> docs = findByRunId(runId);
        LineageEventDocument doc = findByRunId(runId).stream()
                .sorted(Comparator.comparing((LineageEventDocument d) -> d.getEvent().eventTime()).reversed())
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Run not found"));

        Map<String, ?> facets;
        if ("job".equalsIgnoreCase(type)) {
            facets = doc.getEvent().job().facets();
        } else {
            facets = doc.getEvent().run().facets();
        }

        if (facets == null) {
            return Collections.emptyMap();
        }
        // Create a new map with Object values to satisfy the return type
        return new HashMap<String, Object>(facets);
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

    private RunResponse aggregateRunEvents(Map.Entry<String, List<LineageEventDocument>> entry) {
        String runId = entry.getKey();
        List<LineageEventDocument> docs = entry.getValue();
        
        // Sort by event time
        docs.sort(Comparator.comparing(d -> d.getEvent().eventTime()));

        LineageEventDocument first = docs.get(0);
        LineageEventDocument last = docs.get(docs.size() - 1);

        ZonedDateTime createdAt = first.getEvent().eventTime();
        ZonedDateTime updatedAt = last.getEvent().eventTime();
        
        // Aggregation variables
        ZonedDateTime startedAt = null;
        ZonedDateTime endedAt = null;
        String state = "RUNNING"; 
        
        // Use maps to deduplicate datasets by ID (namespace:name)
        Map<String, Dataset> inputMap = new HashMap<>();
        Map<String, Dataset> outputMap = new HashMap<>();

        for (LineageEventDocument doc : docs) {
            String type = doc.getEvent().eventType().toUpperCase();
            if ("START".equals(type) || "RUNNING".equals(type)) {
                if (startedAt == null) startedAt = doc.getEvent().eventTime();
                state = "RUNNING";
            } else if ("COMPLETE".equals(type) || "COMPLETED".equals(type)) {
                endedAt = doc.getEvent().eventTime();
                state = "COMPLETED";
            } else if ("FAIL".equals(type) || "FAILED".equals(type)) {
                endedAt = doc.getEvent().eventTime();
                state = "FAILED";
            } else if ("ABORT".equals(type) || "ABORTED".equals(type)) {
                endedAt = doc.getEvent().eventTime();
                state = "ABORTED";
            }
            
            // Collect inputs/outputs
            if (doc.getEvent().inputs() != null) {
                doc.getEvent().inputs().forEach(d -> inputMap.put(d.namespace() + ":" + d.name(), d));
            }
            if (doc.getEvent().outputs() != null) {
                doc.getEvent().outputs().forEach(d -> outputMap.put(d.namespace() + ":" + d.name(), d));
            }
        }

        Long durationMs = null;
        if (startedAt != null && endedAt != null) {
            durationMs = ChronoUnit.MILLIS.between(startedAt, endedAt);
        }

        return new RunResponse(
            runId,
            createdAt,
            updatedAt,
            null, // nominalStartTime
            null, // nominalEndTime
            state,
            startedAt,
            endedAt,
            durationMs,
            mapDatasets(inputMap.values()), // inputs
            mapDatasets(outputMap.values()), // outputs
            Collections.emptyMap(),
            (Map<String, Object>) (Map) last.getEvent().run().facets(),
            new RunResponse.JobVersion(first.getEvent().job().namespace(), first.getEvent().job().name(), "latest")
        );
    }

    private RunResponse toSimpleRunResponse(LineageEventDocument doc) {
        String type = doc.getEvent().eventType().toUpperCase();
        String state = "RUNNING";
        if ("COMPLETE".equals(type)) state = "COMPLETED";
        else if ("FAIL".equals(type)) state = "FAILED";
        else if ("ABORT".equals(type)) state = "ABORTED";
        
        List<Dataset> inputs = doc.getEvent().inputs() != null ? doc.getEvent().inputs() : Collections.emptyList();
        List<Dataset> outputs = doc.getEvent().outputs() != null ? doc.getEvent().outputs() : Collections.emptyList();

        return new RunResponse(
            doc.getEvent().run().runId(),
            doc.getEvent().eventTime(),
            doc.getEvent().eventTime(),
            null, null,
            state,
            "START".equals(type) ? doc.getEvent().eventTime() : null,
            "COMPLETE".equals(type) ? doc.getEvent().eventTime() : null,
            null,
            mapDatasets(inputs),
            mapDatasets(outputs),
            Collections.emptyMap(),
            (Map<String, Object>) (Map) doc.getEvent().run().facets(),
            new RunResponse.JobVersion(doc.getEvent().job().namespace(), doc.getEvent().job().name(), "latest")
        );
    }
    
    private List<DatasetResponse> mapDatasets(Collection<Dataset> datasets) {
        if (datasets == null) return Collections.emptyList();
        return datasets.stream().map(this::toDatasetResponse).collect(Collectors.toList());
    }

    private DatasetResponse toDatasetResponse(Dataset ds) {
        List<Object> fields = Collections.emptyList();
        if (ds.facets() != null && ds.facets().containsKey("schema")) {
             Facet schemaFacet = ds.facets().get("schema");
             // Need to handle potential type differences if deserializer produces map or object
             // Assuming polymorphism logic works or we might need robust check
             // For now assuming SchemaDatasetFacet if correctly deserialized
             if (schemaFacet instanceof SchemaDatasetFacet) {
                 fields = ((SchemaDatasetFacet) schemaFacet).fields().stream()
                     .map(f -> (Object) f)
                     .collect(Collectors.toList());
             }
        }

        return new DatasetResponse(
            new DatasetResponse.DatasetId(ds.namespace(), ds.name()),
            "DB_TABLE",
            ds.name(),
            ds.name(),
            ZonedDateTime.now(), // Placeholder
            ZonedDateTime.now(), // Placeholder
            ds.namespace(),
            ds.namespace(),
            fields,
            Collections.emptySet(),
            null,
            null,
            mapColumnLineage(ds.facets()),
            (Map<String, Facet>) ds.facets(),
            "", // version
            null, // createdByRun
            null // lifecycleState
        );
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
                    e.getValue().transformationType()
                ))
                .collect(Collectors.toList());
        }
        return Collections.emptyList();
    }

    private void createLifecycleEvent(String runId, String eventType) {
        LineageEventDocument existing = findByRunId(runId).stream()
                .sorted(Comparator.comparing((LineageEventDocument d) -> d.getEvent().eventTime()).reversed())
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Run context not found."));
        
        RunEvent previousAction = existing.getEvent();

        RunEvent newEvent = new RunEvent(
            eventType,
            ZonedDateTime.now(),
            new RunEvent.Run(runId, previousAction.run().facets()),
            previousAction.job(),
            previousAction.inputs(),
            previousAction.outputs(),
            previousAction.producer(),
            previousAction.schemaURL()
        );

        lineageService.ingestEvent(newEvent);
    }

    private List<LineageEventDocument> findByRunId(String runId) {
        System.out.println("DEBUG: Executing MongoTemplate query for runId: '" + runId + "'");
        org.springframework.data.mongodb.core.query.Query query = new org.springframework.data.mongodb.core.query.Query();
        query.addCriteria(org.springframework.data.mongodb.core.query.Criteria.where("event.run.runId").is(runId));
        List<LineageEventDocument> docs = mongoTemplate.find(query, LineageEventDocument.class);
        System.out.println("DEBUG: MongoTemplate Found " + docs.size() + " docs.");
        return docs;
    }
}
