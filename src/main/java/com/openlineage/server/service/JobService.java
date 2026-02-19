package com.openlineage.server.service;

import com.openlineage.server.domain.Job;
import com.openlineage.server.storage.document.JobDocument;
import com.openlineage.server.storage.document.MarquezId;
import org.springframework.stereotype.Service;

import java.time.ZonedDateTime;

@Service
public class JobService {

    private final org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;
    private final VersionService versionService;

    public JobService(org.springframework.data.mongodb.core.MongoTemplate mongoTemplate,
            VersionService versionService) {
        this.mongoTemplate = mongoTemplate;
        this.versionService = versionService;
    }

    public void upsertJob(Job job, ZonedDateTime eventTime, java.util.Map<MarquezId, java.util.UUID> inputs,
            java.util.Map<MarquezId, java.util.UUID> outputs) {
        org.springframework.data.mongodb.core.query.Query query = org.springframework.data.mongodb.core.query.Query
                .query(org.springframework.data.mongodb.core.query.Criteria.where("_id")
                        .is(new MarquezId(job.namespace(), job.name())));

        org.springframework.data.mongodb.core.query.Update update = new org.springframework.data.mongodb.core.query.Update()
                .setOnInsert("createdAt", eventTime)
                .setOnInsert("searchName", job.name())
                .set("updatedAt", eventTime)
                .set("currentVersion", versionService.computeJobVersion(job, inputs, outputs));

        if (inputs != null && !inputs.isEmpty()) {
            update.addToSet("inputs").each(inputs.keySet().toArray());
        }
        if (outputs != null && !outputs.isEmpty()) {
            update.addToSet("outputs").each(outputs.keySet().toArray());
        }

        if (job.facets() != null && !job.facets().isEmpty()) {
            for (java.util.Map.Entry<String, com.openlineage.server.domain.Facet> entry : job.facets().entrySet()) {
                update.set("facets." + com.openlineage.server.storage.document.DocumentDbSanitizer.sanitizeKey(entry.getKey()), com.openlineage.server.storage.document.DocumentDbSanitizer.sanitize(entry.getValue()));
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
