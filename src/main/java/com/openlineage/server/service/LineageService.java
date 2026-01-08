package com.openlineage.server.service;

import com.openlineage.server.domain.Dataset;
import com.openlineage.server.domain.Job;
import com.openlineage.server.domain.RunEvent;
import com.openlineage.server.storage.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Service
public class LineageService {
    private static final Logger log = LoggerFactory.getLogger(LineageService.class);

    private final LineageEventRepository eventRepository;
    private final NamespaceRepository namespaceRepository;
    private final JobRepository jobRepository;
    private final DatasetRepository datasetRepository;
    private final RunRepository runRepository;
    private final DataSourceRepository dataSourceRepository;
    private final FacetMergeService facetMergeService;

    public LineageService(LineageEventRepository eventRepository,
            NamespaceRepository namespaceRepository,
            JobRepository jobRepository,
            DatasetRepository datasetRepository,
            RunRepository runRepository,
            DataSourceRepository dataSourceRepository,
            FacetMergeService facetMergeService) {
        this.eventRepository = eventRepository;
        this.namespaceRepository = namespaceRepository;
        this.jobRepository = jobRepository;
        this.datasetRepository = datasetRepository;
        this.runRepository = runRepository;
        this.dataSourceRepository = dataSourceRepository;
        this.facetMergeService = facetMergeService;
    }

    @Transactional
    public void ingestEvent(RunEvent event) {
        ingestEvent(event, null);
    }

    @Transactional
    public void ingestEvent(RunEvent event, String owner) {
        String producer = event.producer();
        Set<String> namespacesToCheck = new HashSet<>();

        Set<MarquezId> jobInputs = new HashSet<>();
        Set<MarquezId> jobOutputs = new HashSet<>();

        if (event.inputs() != null) {
            event.inputs().forEach(d -> {
                namespacesToCheck.add(d.namespace());
                jobInputs.add(new MarquezId(d.namespace(), d.name()));
                upsertDataset(d, event.eventTime(), true);
                upsertDataSource(d.namespace(), event.eventTime());
            });
        }
        if (event.outputs() != null) {
            event.outputs().forEach(d -> {
                namespacesToCheck.add(d.namespace());
                jobOutputs.add(new MarquezId(d.namespace(), d.name()));
                upsertDataset(d, event.eventTime(), false);
                upsertDataSource(d.namespace(), event.eventTime());
            });
        }

        // Extract all involved namespaces
        String jobNamespace = null;
        if (event.job() != null && event.job().namespace() != null) {
            jobNamespace = event.job().namespace();
            namespacesToCheck.add(jobNamespace);
            upsertJob(event.job(), event.eventTime(), jobInputs, jobOutputs);
            upsertRun(event);
        }

        // Governance Check - Job Namespace Ownership (x-user)
        if (owner != null && jobNamespace != null) {
            validateJobNamespaceOwnership(jobNamespace, owner);
        }

        // Legacy Governance Check (Producer Validation)
        for (String ns : namespacesToCheck) {
            validateOrRegisterNamespace(ns, producer);
        }

        // Save Event
        LineageEventDocument doc = new LineageEventDocument(event);
        eventRepository.save(doc);
        log.info("Ingested event for run: {}", event.run().runId());
    }

    private void validateJobNamespaceOwnership(String namespace, String owner) {
        Optional<NamespaceRegistryDocument> nsDocOpt = namespaceRepository.findById(namespace);

        if (nsDocOpt.isPresent()) {
            NamespaceRegistryDocument nsDoc = nsDocOpt.get();
            // Check if Unclaimed
            if ("Unclaimed".equals(nsDoc.getOwnerTeam())) {
                // Take over ownership
                nsDoc.setOwnerTeam(owner);
                namespaceRepository.save(nsDoc);
                log.info("User '{}' claimed ownership of namespace '{}'", owner, namespace);
            } else if (nsDoc.getOwnerTeam() != null && !nsDoc.getOwnerTeam().equals(owner)) {
                log.warn("Access Denied: Owner '{}' is not allowed for namespace '{}' (owned by '{}')", owner,
                        namespace, nsDoc.getOwnerTeam());
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        String.format("User '%s' is not authorized to access namespace '%s' owned by '%s'", owner,
                                namespace, nsDoc.getOwnerTeam()));
            }
        } else {
            // New namespace claiming
            NamespaceRegistryDocument newNs = new NamespaceRegistryDocument(
                    namespace,
                    owner, // Set owner from header
                    null,
                    false,
                    null);
            namespaceRepository.save(newNs);
            log.info("Auto-registered new namespace '{}' with owner '{}'", namespace, owner);
        }
    }

    private void validateOrRegisterNamespace(String namespace, String producer) {
        // If we just created it in validateJobNamespaceOwnership, it might be in
        // cache/context,
        // but since we look up by ID again, it should be fine.
        Optional<NamespaceRegistryDocument> nsDocOpt = namespaceRepository.findById(namespace);

        if (nsDocOpt.isPresent()) {
            NamespaceRegistryDocument nsDoc = nsDocOpt.get();
            if (nsDoc.isLocked()) {
                if (nsDoc.getAllowedProducers() == null || !nsDoc.getAllowedProducers().contains(producer)) {
                    log.warn("Access Denied: Producer '{}' is not allowed for namespace '{}'", producer, namespace);
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                            String.format("Producer '%s' is not allowed to write to locked namespace '%s'", producer,
                                    namespace));
                }
            }
        } else {
            NamespaceRegistryDocument newNs = new NamespaceRegistryDocument(
                    namespace,
                    "Unclaimed",
                    null,
                    false,
                    null);
            namespaceRepository.save(newNs);
            log.info("Auto-registered new namespace: {}", namespace);
        }
    }

    private void upsertRun(RunEvent event) {
        RunDocument runDoc = runRepository.findById(event.run().runId())
                .orElse(new RunDocument(
                        event.run().runId(),
                        new MarquezId(event.job().namespace(), event.job().name()),
                        event.eventTime(),
                        event.eventType(),
                        event.inputs(),
                        event.outputs(),
                        (java.util.Map<String, com.openlineage.server.domain.Facet>) (java.util.Map) event.run()
                                .facets()));

        runDoc.setEventType(event.eventType());
        runDoc.setEventTime(event.eventTime());

        String type = event.eventType().toUpperCase();
        if ("START".equals(type)) {
            runDoc.setStartTime(event.eventTime());
        }
        if ("COMPLETE".equals(type) || "FAIL".equals(type) || "ABORT".equals(type)) {
            runDoc.setEndTime(event.eventTime());
        }

        runDoc.setUpdatedAt(event.eventTime());

        runRepository.save(runDoc);
    }

    private void upsertJob(Job job, java.time.ZonedDateTime eventTime, java.util.Set<MarquezId> inputs,
            java.util.Set<MarquezId> outputs) {
        JobDocument doc = jobRepository.findById(new MarquezId(job.namespace(), job.name()))
                .orElseGet(() -> {
                    JobDocument newDoc = new JobDocument(job.namespace(), job.name(), job.facets(), inputs, outputs,
                            eventTime);
                    newDoc.setCreatedAt(eventTime);
                    return newDoc;
                });

        if (doc.getInputs() == null)
            doc.setInputs(new HashSet<>());
        if (doc.getOutputs() == null)
            doc.setOutputs(new HashSet<>());

        if (!inputs.isEmpty())
            doc.getInputs().addAll(inputs);
        if (!outputs.isEmpty())
            doc.getOutputs().addAll(outputs);

        boolean changed = false;
        if (doc.getUpdatedAt().isBefore(eventTime)) {
            doc.setUpdatedAt(eventTime);
            changed = true;
        }
        if (job.facets() != null && !job.facets().isEmpty()) {
            doc.setFacets(job.facets()); // simple replace for job facets
            changed = true;
        }

        if (changed) {
            jobRepository.save(doc);
        }
    }

    private void upsertDataset(Dataset dataset, java.time.ZonedDateTime eventTime, boolean isInput) {
        // 1. Update Core Dataset Document
        java.util.List<Object> extractedFields = null;
        if (dataset.facets() != null && dataset.facets().containsKey("schema")) {
            com.openlineage.server.domain.Facet schemaFacet = dataset.facets().get("schema");
            if (schemaFacet instanceof com.openlineage.server.domain.SchemaDatasetFacet) {
                extractedFields = ((com.openlineage.server.domain.SchemaDatasetFacet) schemaFacet).fields().stream()
                        .map(f -> (Object) f)
                        .collect(java.util.stream.Collectors.toList());
            }
        }
        final java.util.List<Object> fields = extractedFields;
        String sourceName = dataset.namespace();

        DatasetDocument doc = datasetRepository.findById(new MarquezId(dataset.namespace(), dataset.name()))
                .orElseGet(() -> {
                    DatasetDocument newDoc = new DatasetDocument(dataset.namespace(), dataset.name(), sourceName,
                            fields, eventTime);
                    newDoc.setCreatedAt(eventTime);
                    return newDoc;
                });

        doc.setSourceName(sourceName);
        if (fields != null)
            doc.setFields(fields);
        doc.setUpdatedAt(eventTime);
        datasetRepository.save(doc);

        // 2. Merge Facets into Split Collections
        if (isInput) {
            facetMergeService.mergeInputFacets(dataset.namespace(), dataset.name(), dataset.facets(), eventTime);
        } else {
            facetMergeService.mergeOutputFacets(dataset.namespace(), dataset.name(), dataset.facets(), eventTime);
        }
    }

    private void upsertDataSource(String namespace, java.time.ZonedDateTime eventTime) {
        if (!dataSourceRepository.existsById(namespace)) {
            dataSourceRepository.save(new DataSourceDocument(namespace, namespace, eventTime));
        }
    }

}
