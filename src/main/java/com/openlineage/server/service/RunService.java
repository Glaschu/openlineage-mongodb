package com.openlineage.server.service;

import com.openlineage.server.domain.RunEvent;
import com.openlineage.server.storage.document.MarquezId;
import com.openlineage.server.storage.document.RunDocument;
import org.springframework.stereotype.Service;

@Service
public class RunService {

    private final org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    public RunService(org.springframework.data.mongodb.core.MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public void upsertRun(RunEvent event) {
        String runId = event.run().runId();
        org.springframework.data.mongodb.core.query.Query query = org.springframework.data.mongodb.core.query.Query
                .query(org.springframework.data.mongodb.core.query.Criteria.where("_id").is(runId));

        org.springframework.data.mongodb.core.query.Update update = new org.springframework.data.mongodb.core.query.Update()
                .setOnInsert("jobNamespace", event.job().namespace())
                .setOnInsert("jobName", event.job().name())
                .setOnInsert("createdAt", java.time.ZonedDateTime.now())
                .set("eventType", event.eventType())
                .set("eventTime", event.eventTime())
                .set("updatedAt", event.eventTime());

        if (event.inputs() != null && !event.inputs().isEmpty()) {
            update.addToSet("inputs").each(event.inputs().toArray());
        }
        if (event.outputs() != null && !event.outputs().isEmpty()) {
            update.addToSet("outputs").each(event.outputs().toArray());
        }

        if (event.run().facets() != null && !event.run().facets().isEmpty()) {
            // Facets logic: replace atomic or merge? For Run, replacing run facets map is
            // standard as they naturally specific to the run state.
            for (java.util.Map.Entry<String, Object> entry : event.run().facets().entrySet()) {
                update.set("runFacets." + com.openlineage.server.storage.document.DocumentDbSanitizer.sanitizeKey(entry.getKey()), com.openlineage.server.storage.document.DocumentDbSanitizer.sanitize(entry.getValue()));
            }
        }

        String type = event.eventType().toUpperCase();
        if ("START".equals(type)) {
            update.set("startTime", event.eventTime());
        }
        if ("COMPLETE".equals(type) || "FAIL".equals(type) || "ABORT".equals(type)) {
            update.set("endTime", event.eventTime());
        }

        mongoTemplate.upsert(query, update, RunDocument.class);
    }
}
