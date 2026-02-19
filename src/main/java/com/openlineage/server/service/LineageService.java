package com.openlineage.server.service;

import com.openlineage.server.domain.RunEvent;
import com.openlineage.server.storage.document.LineageEdgeDocument;
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

    public LineageService(LineageEventRepository eventRepository,
            GovernanceService governanceService,
            JobService jobService,
            RunService runService,
            DatasetService datasetService,
            MongoTemplate mongoTemplate) {
        this.eventRepository = eventRepository;
        this.governanceService = governanceService;
        this.jobService = jobService;
        this.runService = runService;
        this.datasetService = datasetService;
        this.mongoTemplate = mongoTemplate;
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
                jobInputs.put(new MarquezId(d.namespace(), d.name()), version);
                datasetService.upsertDataSource(d.namespace(), event.eventTime());
            });
        }
        if (event.outputs() != null) {
            event.outputs().forEach(d -> {
                namespacesToCheck.add(d.namespace());
                java.util.UUID version = datasetService.upsertDataset(d, event.eventTime(), false);
                jobOutputs.put(new MarquezId(d.namespace(), d.name()), version);
                datasetService.upsertDataSource(d.namespace(), event.eventTime());
            });
        }

        // Extract all involved namespaces
        String jobNamespace = null;
        if (event.job() != null && event.job().namespace() != null) {
            jobNamespace = event.job().namespace();
            namespacesToCheck.add(jobNamespace);
            jobService.upsertJob(event.job(), event.eventTime(), jobInputs, jobOutputs);
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

        // Save Event
        LineageEventDocument doc = new LineageEventDocument(event);
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
                upsertEdge("dataset", input.namespace(), input.name(),
                        "job", jobNamespace, jobName,
                        "input", event.eventTime());
            }
        }

        if (event.outputs() != null) {
            for (var output : event.outputs()) {
                upsertEdge("job", jobNamespace, jobName,
                        "dataset", output.namespace(), output.name(),
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
}
