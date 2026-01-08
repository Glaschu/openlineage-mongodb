package com.openlineage.server.service;

import com.openlineage.server.domain.RunEvent;
import com.openlineage.server.storage.document.LineageEventDocument;
import com.openlineage.server.storage.repository.LineageEventRepository;
import com.openlineage.server.storage.document.MarquezId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    public LineageService(LineageEventRepository eventRepository,
            GovernanceService governanceService,
            JobService jobService,
            RunService runService,
            DatasetService datasetService) {
        this.eventRepository = eventRepository;
        this.governanceService = governanceService;
        this.jobService = jobService;
        this.runService = runService;
        this.datasetService = datasetService;
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
                datasetService.upsertDataset(d, event.eventTime(), true);
                datasetService.upsertDataSource(d.namespace(), event.eventTime());
            });
        }
        if (event.outputs() != null) {
            event.outputs().forEach(d -> {
                namespacesToCheck.add(d.namespace());
                jobOutputs.add(new MarquezId(d.namespace(), d.name()));
                datasetService.upsertDataset(d, event.eventTime(), false);
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
}
