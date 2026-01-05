package com.openlineage.server.service;

import com.openlineage.server.domain.Dataset;
import com.openlineage.server.domain.Job;
import com.openlineage.server.domain.RunEvent;
import com.openlineage.server.storage.DatasetDocument;
import com.openlineage.server.storage.DatasetRepository;
import com.openlineage.server.storage.JobDocument;
import com.openlineage.server.storage.JobRepository;
import com.openlineage.server.storage.LineageEventDocument;
import com.openlineage.server.storage.LineageEventRepository;
import com.openlineage.server.storage.NamespaceRegistryDocument;
import com.openlineage.server.storage.NamespaceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
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

    public LineageService(LineageEventRepository eventRepository, NamespaceRepository namespaceRepository,
                          JobRepository jobRepository, DatasetRepository datasetRepository) {
        this.eventRepository = eventRepository;
        this.namespaceRepository = namespaceRepository;
        this.jobRepository = jobRepository;
        this.datasetRepository = datasetRepository;
    }

    @Transactional
    public void ingestEvent(RunEvent event) {
        String producer = event.producer();
        Set<String> namespacesToCheck = new HashSet<>();
        
        Set<com.openlineage.server.storage.MarquezId> jobInputs = new HashSet<>();
        Set<com.openlineage.server.storage.MarquezId> jobOutputs = new HashSet<>();

        if (event.inputs() != null) {
            event.inputs().forEach(d -> {
                namespacesToCheck.add(d.namespace());
                jobInputs.add(new com.openlineage.server.storage.MarquezId(d.namespace(), d.name()));
                upsertDataset(d, event.eventTime());
            });
        }
        if (event.outputs() != null) {
            event.outputs().forEach(d -> {
                namespacesToCheck.add(d.namespace());
                jobOutputs.add(new com.openlineage.server.storage.MarquezId(d.namespace(), d.name()));
                upsertDataset(d, event.eventTime());
            });
        }

        // Extract all involved namespaces
        if (event.job() != null && event.job().namespace() != null) {
            namespacesToCheck.add(event.job().namespace());
            upsertJob(event.job(), event.eventTime(), jobInputs, jobOutputs);
        }

        // Governance Check
        for (String ns : namespacesToCheck) {
            validateOrRegisterNamespace(ns, producer);
        }

        // Save Event
        LineageEventDocument doc = new LineageEventDocument(event);
        eventRepository.save(doc);
        log.info("Ingested event for run: {}", event.run().runId());
    }

    private void upsertJob(Job job, java.time.ZonedDateTime eventTime, java.util.Set<com.openlineage.server.storage.MarquezId> inputs, java.util.Set<com.openlineage.server.storage.MarquezId> outputs) {
        JobDocument doc = jobRepository.findById(new com.openlineage.server.storage.MarquezId(job.namespace(), job.name()))
            .orElseGet(() -> {
                JobDocument newDoc = new JobDocument(job.namespace(), job.name(), job.facets(), inputs, outputs, eventTime);
                newDoc.setCreatedAt(eventTime); // Explicitly set creation time from event
                return newDoc;
            });
        
        if (doc.getInputs() == null) doc.setInputs(new java.util.HashSet<>());
        if (doc.getOutputs() == null) doc.setOutputs(new java.util.HashSet<>());

        if (!inputs.isEmpty()) {
            doc.getInputs().addAll(inputs);
        }
        if (!outputs.isEmpty()) {
            doc.getOutputs().addAll(outputs);
        }
        
        doc.setFacets(job.facets());
        if (doc.getCreatedAt() == null) {
            doc.setCreatedAt(eventTime);
        }
        doc.setUpdatedAt(eventTime);
        jobRepository.save(doc);
    }

    private void upsertDataset(Dataset dataset, java.time.ZonedDateTime eventTime) {
        // Extract fields from SchemaDatasetFacet if present
        java.util.List<Object> extractedFields = null;
        if (dataset.facets() != null && dataset.facets().containsKey("schema")) {
             com.openlineage.server.domain.Facet schemaFacet = dataset.facets().get("schema");
             if (schemaFacet instanceof com.openlineage.server.domain.SchemaDatasetFacet) {
                 extractedFields = ((com.openlineage.server.domain.SchemaDatasetFacet) schemaFacet).fields().stream()
                     .map(f -> (Object) f) // Keeping as Object as defined in Document/DTO
                     .collect(java.util.stream.Collectors.toList());
             }
        }
        final java.util.List<Object> fields = extractedFields;

        // Extract Source Name usually from namespace or a facet? 
        // OpenLineage dataset name is often hierarchical. 
        // For now, defaulting sourceName to namespace if not explicit.
        String sourceName = dataset.namespace(); 

        DatasetDocument doc = datasetRepository.findById(new com.openlineage.server.storage.MarquezId(dataset.namespace(), dataset.name()))
            .orElseGet(() -> {
                DatasetDocument newDoc = new DatasetDocument(dataset.namespace(), dataset.name(), sourceName, fields, dataset.facets(), eventTime);
                newDoc.setCreatedAt(eventTime);
                return newDoc;
            });

        if (doc.getFacets() == null) doc.setFacets(new java.util.HashMap<>());
        if (dataset.facets() != null) {
            doc.getFacets().putAll(dataset.facets());
        }
        
        doc.setSourceName(sourceName); // Update if logic improves
        if (fields != null) doc.setFields(fields);
        doc.setUpdatedAt(eventTime);
        if (doc.getCreatedAt() == null) {
            doc.setCreatedAt(eventTime);
        }
        datasetRepository.save(doc);
    }

    private void validateOrRegisterNamespace(String namespace, String producer) {
        Optional<NamespaceRegistryDocument> nsDocOpt = namespaceRepository.findById(namespace);

        if (nsDocOpt.isPresent()) {
            NamespaceRegistryDocument nsDoc = nsDocOpt.get();
            if (nsDoc.isLocked()) {
                if (nsDoc.getAllowedProducers() == null || !nsDoc.getAllowedProducers().contains(producer)) {
                    log.warn("Access Denied: Producer '{}' is not allowed for namespace '{}'", producer, namespace);
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, 
                        String.format("Producer '%s' is not allowed to write to locked namespace '%s'", producer, namespace));
                }
            }
        } else {
            // Auto-register as Unclaimed
            NamespaceRegistryDocument newNs = new NamespaceRegistryDocument(
                namespace, 
                "Unclaimed", 
                null, 
                false, // Not locked by default check
                null // description
            );
            namespaceRepository.save(newNs);
            log.info("Auto-registered new namespace: {}", namespace);
        }
    }
}
