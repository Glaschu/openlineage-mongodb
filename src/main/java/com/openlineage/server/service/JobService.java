package com.openlineage.server.service;

import com.openlineage.server.domain.Job;
import com.openlineage.server.storage.document.JobDocument;
import com.openlineage.server.storage.document.MarquezId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.ZonedDateTime;

@Service
public class JobService {

    private final MongoTemplate mongoTemplate;
    private final VersionService versionService;

    public JobService(MongoTemplate mongoTemplate, VersionService versionService) {
        this.mongoTemplate = mongoTemplate;
        this.versionService = versionService;
    }

    public void upsertJob(Job job, ZonedDateTime eventTime, java.util.Map<MarquezId, java.util.UUID> inputs,
            java.util.Map<MarquezId, java.util.UUID> outputs, String parentJobName,
            java.util.UUID parentJobUuid, String runId, boolean isNewRun) {

        MarquezId jobId = new MarquezId(job.namespace(), job.name());

        Query query = Query.query(Criteria.where("_id").is(jobId));

        Update update = new Update()
                .setOnInsert("createdAt", eventTime)
                .setOnInsert("searchName", job.name())
                .set("updatedAt", eventTime)
                .set("latestRunId", runId)
                .set("currentVersion", versionService.computeJobVersion(job, inputs, outputs));

        if (parentJobName != null) {
            update.set("parentJobName", parentJobName);
            if (parentJobUuid != null) {
                update.set("parentJobUuid", parentJobUuid);
            }
        }

        if (inputs != null && !inputs.isEmpty()) {
            if (isNewRun) {
                // New run: replace inputs with this run's inputs
                update.set("inputs", inputs.keySet());
            } else {
                // Same run: merge inputs (Glue partial events)
                update.addToSet("inputs").each(inputs.keySet().toArray());
            }
        }
        if (outputs != null && !outputs.isEmpty()) {
            if (isNewRun) {
                update.set("outputs", outputs.keySet());
            } else {
                update.addToSet("outputs").each(outputs.keySet().toArray());
            }
        }

        if (job.facets() != null && !job.facets().isEmpty()) {
            for (java.util.Map.Entry<String, com.openlineage.server.domain.Facet> entry : job.facets().entrySet()) {
                update.set(
                        "facets." + com.openlineage.server.storage.document.DocumentDbSanitizer
                                .sanitizeKey(entry.getKey()),
                        com.openlineage.server.storage.document.DocumentDbSanitizer.sanitize(entry.getValue()));
            }

            // Extract Description
            if (job.facets().containsKey("documentation")) {
                com.openlineage.server.domain.Facet facet = job.facets().get("documentation");
                if (facet instanceof com.openlineage.server.domain.DocumentationFacet docFacet) {
                    if (docFacet.description() != null) {
                        update.set("description", docFacet.description());
                    }
                } else if (facet instanceof com.openlineage.server.domain.GenericFacet) {
                    Object desc = ((com.openlineage.server.domain.GenericFacet) facet).getAdditionalProperties()
                            .get("description");
                    if (desc != null) {
                        update.set("description", desc.toString());
                    }
                }
            }

            // Extract Location
            if (job.facets().containsKey("sourceCodeLocation")) {
                com.openlineage.server.domain.Facet facet = job.facets().get("sourceCodeLocation");
                if (facet instanceof com.openlineage.server.domain.SourceCodeLocationJobFacet scFacet) {
                    if (scFacet.url() != null) {
                        update.set("location", scFacet.url());
                    }
                } else if (facet instanceof com.openlineage.server.domain.GenericFacet) {
                    Object url = ((com.openlineage.server.domain.GenericFacet) facet).getAdditionalProperties()
                            .get("url");
                    if (url != null) {
                        update.set("location", url.toString());
                    }
                }
            }
        }

        mongoTemplate.upsert(query, update, JobDocument.class);
    }
}
