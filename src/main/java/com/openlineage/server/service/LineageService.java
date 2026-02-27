package com.openlineage.server.service;

import com.openlineage.server.domain.RunEvent;
import com.openlineage.server.storage.document.DocumentDbSanitizer;
import com.openlineage.server.storage.document.LineageEdgeDocument;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.openlineage.server.storage.document.LineageEventDocument;
import com.openlineage.server.storage.repository.LineageEventRepository;
import com.openlineage.server.storage.document.MarquezId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

@Service
public class LineageService {
    private static final Logger log = LoggerFactory.getLogger(LineageService.class);

    private final LineageEventRepository eventRepository;
    private final GovernanceService governanceService;
    private final JobService jobService;
    private final RunService runService;
    private final DatasetService datasetService;
    private final MongoTemplate mongoTemplate;
    private final DatasetNameNormalizer nameNormalizer;

    public LineageService(LineageEventRepository eventRepository,
            GovernanceService governanceService,
            JobService jobService,
            RunService runService,
            DatasetService datasetService,
            MongoTemplate mongoTemplate,
            DatasetNameNormalizer nameNormalizer) {
        this.eventRepository = eventRepository;
        this.governanceService = governanceService;
        this.jobService = jobService;
        this.runService = runService;
        this.datasetService = datasetService;
        this.mongoTemplate = mongoTemplate;
        this.nameNormalizer = nameNormalizer;
    }

    @Transactional
    public void ingestEvent(RunEvent event) {
        ingestEvent(event, null);
    }

    @Transactional
    public void ingestEvent(RunEvent event, String owner) {
        String producer = event.producer();
        Set<String> namespacesToCheck = new HashSet<>();

        java.util.Map<MarquezId, java.util.UUID> jobInputs = new java.util.HashMap<>();
        java.util.Map<MarquezId, java.util.UUID> jobOutputs = new java.util.HashMap<>();

        if (event.inputs() != null) {
            event.inputs().forEach(d -> {
                namespacesToCheck.add(d.namespace());
                java.util.UUID version = datasetService.upsertDataset(d, event.eventTime(), true);
                jobInputs.put(new MarquezId(d.namespace(), nameNormalizer.normalize(d.name())), version);
                datasetService.upsertDataSource(d.namespace(), event.eventTime());
            });
        }
        if (event.outputs() != null) {
            event.outputs().forEach(d -> {
                namespacesToCheck.add(d.namespace());
                java.util.UUID version = datasetService.upsertDataset(d, event.eventTime(), false);
                jobOutputs.put(new MarquezId(d.namespace(), nameNormalizer.normalize(d.name())), version);
                datasetService.upsertDataSource(d.namespace(), event.eventTime());
            });
        }

        // Extract all involved namespaces
        String jobNamespace = null;
        if (event.job() != null && event.job().namespace() != null) {
            jobNamespace = event.job().namespace();
            namespacesToCheck.add(jobNamespace);

            String parentJobName = null;
            java.util.UUID parentJobUuid = null;

            if (event.run() != null && event.run().facets() != null && event.run().facets().containsKey("parent")) {
                Object parentObj = event.run().facets().get("parent");
                if (parentObj instanceof java.util.Map map) {
                    Object jobObj = map.get("job");
                    if (jobObj instanceof java.util.Map jobMap) {
                        String pNamespace = (String) jobMap.get("namespace");
                        String pName = (String) jobMap.get("name");
                        if (pName != null && pNamespace != null) {
                            parentJobName = pName;
                            // Deterministic UUID for parent job matching VersionService logic
                            String pIdString = pNamespace + pName;
                            parentJobUuid = java.util.UUID
                                    .nameUUIDFromBytes(pIdString.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                        }
                    }
                }
            }

            jobService.upsertJob(event.job(), event.eventTime(), jobInputs, jobOutputs, parentJobName, parentJobUuid);
            runService.upsertRun(event);

            // Upsert materialized lineage edges for fast graph queries
            upsertLineageEdges(event);
        }

        // Governance Check - Job Namespace Ownership (x-user)
        if (owner != null && jobNamespace != null) {
            governanceService.validateJobNamespaceOwnership(jobNamespace, owner);
        }

        // Legacy Governance Check (Producer Validation)
        for (String ns : namespacesToCheck) {
            governanceService.validateOrRegisterNamespace(ns, producer);
        }

        // Save Event — sanitize the raw event to replace dotted map keys
        // (e.g. "spark.master") that DocumentDB/MongoDB forbid in field names.
        RunEvent sanitizedEvent = sanitizeEventForStorage(event);
        LineageEventDocument doc = new LineageEventDocument(sanitizedEvent);
        eventRepository.save(doc);
        log.info("Ingested event for run: {}", event.run().runId());
    }

    /**
     * Upserts materialized lineage edges for fast graph traversal.
     * - Input datasets: dataset → job (edgeType = "input")
     * - Output datasets: job → dataset (edgeType = "output")
     */
    private void upsertLineageEdges(RunEvent event) {
        String jobNamespace = event.job().namespace();
        String jobName = event.job().name();

        if (event.inputs() != null) {
            for (var input : event.inputs()) {
                upsertEdge("dataset", input.namespace(), nameNormalizer.normalize(input.name()),
                        "job", jobNamespace, jobName,
                        "input", event.eventTime());
            }
        }

        if (event.outputs() != null) {
            for (var output : event.outputs()) {
                upsertEdge("job", jobNamespace, jobName,
                        "dataset", output.namespace(), nameNormalizer.normalize(output.name()),
                        "output", event.eventTime());
            }
        }
    }

    private void upsertEdge(String sourceType, String sourceNs, String sourceName,
            String targetType, String targetNs, String targetName,
            String edgeType, java.time.ZonedDateTime eventTime) {
        Query query = Query.query(
                Criteria.where("sourceNamespace").is(sourceNs)
                        .and("sourceName").is(sourceName)
                        .and("targetNamespace").is(targetNs)
                        .and("targetName").is(targetName));

        Update update = new Update()
                .setOnInsert("sourceType", sourceType)
                .setOnInsert("targetType", targetType)
                .setOnInsert("edgeType", edgeType)
                .set("updatedAt", eventTime);

        mongoTemplate.upsert(query, update, LineageEdgeDocument.class);
    }

    /**
     * Creates a sanitized copy of a RunEvent where all map keys containing dots
     * or dollars are replaced, making it safe for DocumentDB/MongoDB storage.
     * Re-uses DocumentDbSanitizer.sanitize() which already handles recursive
     * key sanitization across the entire object graph.
     */
    private RunEvent sanitizeEventForStorage(RunEvent event) {
        Object sanitized = DocumentDbSanitizer.sanitize(event);
        ObjectMapper mapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper.convertValue(sanitized, RunEvent.class);
    }
}
