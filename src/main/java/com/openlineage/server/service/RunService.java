package com.openlineage.server.service;

import com.openlineage.server.domain.RunEvent;
import com.openlineage.server.storage.MarquezId;
import com.openlineage.server.storage.RunDocument;
import com.openlineage.server.storage.RunRepository;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class RunService {

    private final RunRepository runRepository;

    public RunService(RunRepository runRepository) {
        this.runRepository = runRepository;
    }

    public void upsertRun(RunEvent event) {
        RunDocument runDoc = runRepository.findById(event.run().runId())
                .orElse(new RunDocument(
                        event.run().runId(),
                        new MarquezId(event.job().namespace(), event.job().name()),
                        event.eventTime(),
                        event.eventType(),
                        event.inputs(),
                        event.outputs(),
                        (Map<String, com.openlineage.server.domain.Facet>) (Map) event.run()
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
}
