package com.openlineage.server.service;

import com.openlineage.server.domain.Facet;
import com.openlineage.server.storage.document.InputDatasetFacetDocument;
import com.openlineage.server.storage.document.MarquezId;
import com.openlineage.server.storage.document.OutputDatasetFacetDocument;
import org.springframework.stereotype.Service;

import java.time.ZonedDateTime;
import java.util.Map;

@Service
public class FacetMergeService {

    private final org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    public FacetMergeService(org.springframework.data.mongodb.core.MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public void mergeInputFacets(String namespace, String name, Map<String, Facet> newFacets, ZonedDateTime eventTime) {
        upsertFacet(namespace, name, newFacets, eventTime, InputDatasetFacetDocument.class);
    }

    public void mergeOutputFacets(String namespace, String name, Map<String, Facet> newFacets,
            ZonedDateTime eventTime) {
        upsertFacet(namespace, name, newFacets, eventTime, OutputDatasetFacetDocument.class);
    }

    private <T> void upsertFacet(String namespace, String name,
            Map<String, Facet> newFacets, ZonedDateTime eventTime,
            Class<T> entityClass) {
        if (newFacets == null || newFacets.isEmpty()) {
            return;
        }

        MarquezId id = new MarquezId(namespace, name);
        org.springframework.data.mongodb.core.query.Query query = org.springframework.data.mongodb.core.query.Query
                .query(org.springframework.data.mongodb.core.query.Criteria.where("_id").is(id));

        org.springframework.data.mongodb.core.query.Update update = new org.springframework.data.mongodb.core.query.Update()
                .setOnInsert("createdAt", eventTime)
                .set("updatedAt", eventTime);

        for (Map.Entry<String, Facet> entry : newFacets.entrySet()) {
            update.set("facets." + com.openlineage.server.storage.document.DocumentDbSanitizer.sanitizeKey(entry.getKey()), com.openlineage.server.storage.document.DocumentDbSanitizer.sanitize(entry.getValue()));
        }

        mongoTemplate.upsert(query, update, entityClass);
    }
}
