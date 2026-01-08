package com.openlineage.server.service;

import com.openlineage.server.domain.Job;
import com.openlineage.server.storage.JobDocument;
import com.openlineage.server.storage.MarquezId;
import org.springframework.stereotype.Service;

import java.time.ZonedDateTime;
import java.util.Set;

@Service
public class JobService {

    private final org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    public JobService(org.springframework.data.mongodb.core.MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public void upsertJob(Job job, ZonedDateTime eventTime, Set<MarquezId> inputs, Set<MarquezId> outputs) {
        org.springframework.data.mongodb.core.query.Query query = org.springframework.data.mongodb.core.query.Query
                .query(org.springframework.data.mongodb.core.query.Criteria.where("_id")
                        .is(new MarquezId(job.namespace(), job.name())));

        org.springframework.data.mongodb.core.query.Update update = new org.springframework.data.mongodb.core.query.Update()
                .setOnInsert("createdAt", eventTime)
                .set("updatedAt", eventTime);

        if (inputs != null && !inputs.isEmpty()) {
            update.addToSet("inputs").each(inputs.toArray());
        }
        if (outputs != null && !outputs.isEmpty()) {
            update.addToSet("outputs").each(outputs.toArray());
        }

        if (job.facets() != null && !job.facets().isEmpty()) {
            update.set("facets", job.facets());
        }

        mongoTemplate.upsert(query, update, JobDocument.class);
    }
}
