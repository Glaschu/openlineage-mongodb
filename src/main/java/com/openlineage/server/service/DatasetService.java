package com.openlineage.server.service;

import com.openlineage.server.domain.Dataset;
import com.openlineage.server.storage.document.DataSourceDocument;
import com.openlineage.server.storage.document.DatasetDocument;
import com.openlineage.server.storage.document.MarquezId;
import org.springframework.stereotype.Service;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DatasetService {

    private final org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;
    private final FacetMergeService facetMergeService;
    private final VersionService versionService;

    public DatasetService(org.springframework.data.mongodb.core.MongoTemplate mongoTemplate,
            FacetMergeService facetMergeService, VersionService versionService) {
        this.mongoTemplate = mongoTemplate;
        this.facetMergeService = facetMergeService;
        this.versionService = versionService;
    }

    public void upsertDataset(Dataset dataset, ZonedDateTime eventTime, boolean isInput) {
        // 1. Update Core Dataset Document
        List<Object> extractedFields = null;
        if (dataset.facets() != null && dataset.facets().containsKey("schema")) {
            com.openlineage.server.domain.Facet schemaFacet = dataset.facets().get("schema");
            if (schemaFacet instanceof com.openlineage.server.domain.SchemaDatasetFacet) {
                extractedFields = ((com.openlineage.server.domain.SchemaDatasetFacet) schemaFacet).fields().stream()
                        .map(f -> (Object) f)
                        .collect(Collectors.toList());
            }
        }
        String sourceName = dataset.namespace();

        org.springframework.data.mongodb.core.query.Query query = org.springframework.data.mongodb.core.query.Query
                .query(org.springframework.data.mongodb.core.query.Criteria.where("_id")
                        .is(new MarquezId(dataset.namespace(), dataset.name())));

        org.springframework.data.mongodb.core.query.Update update = new org.springframework.data.mongodb.core.query.Update()
                .setOnInsert("createdAt", eventTime)
                .set("updatedAt", eventTime)
                .set("sourceName", sourceName)
                .set("isDeleted", false)
                .set("currentVersion", versionService.computeDatasetVersion(dataset));

        if (extractedFields != null) {
            update.set("fields", extractedFields);
        }

        if (dataset.facets() != null && !dataset.facets().isEmpty()) {
            update.set("facets", dataset.facets());

            // Extract Description
            if (dataset.facets().containsKey("documentation")) {
                com.openlineage.server.domain.Facet facet = dataset.facets().get("documentation");
                if (facet instanceof com.openlineage.server.domain.GenericFacet) {
                    Object desc = ((com.openlineage.server.domain.GenericFacet) facet).getAdditionalProperties()
                            .get("description");
                    if (desc != null) {
                        update.set("description", desc.toString());
                    }
                }
            }

            // Extract Tags (experimental support for 'tags' facet)
            if (dataset.facets().containsKey("tags")) {
                com.openlineage.server.domain.Facet facet = dataset.facets().get("tags");
                if (facet instanceof com.openlineage.server.domain.GenericFacet) {
                    Object tagsObj = ((com.openlineage.server.domain.GenericFacet) facet).getAdditionalProperties()
                            .get("tags");
                    if (tagsObj instanceof List) {
                        List<?> tagsList = (List<?>) tagsObj;
                        if (!tagsList.isEmpty() && tagsList.get(0) instanceof String) {
                            update.addToSet("tags").each(tagsList.toArray());
                        }
                    }
                }
            }
        }

        mongoTemplate.upsert(query, update, DatasetDocument.class);

        // 2. Merge Facets into Split Collections
        if (isInput) {
            facetMergeService.mergeInputFacets(dataset.namespace(), dataset.name(), dataset.facets(), eventTime);
        } else {
            facetMergeService.mergeOutputFacets(dataset.namespace(), dataset.name(), dataset.facets(), eventTime);
        }
    }

    public void upsertDataSource(String namespace, ZonedDateTime eventTime) {
        org.springframework.data.mongodb.core.query.Query query = org.springframework.data.mongodb.core.query.Query
                .query(org.springframework.data.mongodb.core.query.Criteria.where("_id").is(namespace));

        org.springframework.data.mongodb.core.query.Update update = new org.springframework.data.mongodb.core.query.Update()
                .setOnInsert("name", namespace)
                .setOnInsert("createdAt", eventTime)
                .set("updatedAt", eventTime)
                .set("type", "POSTGRESQL") // Placeholder/Default
                .set("description", "");

        mongoTemplate.upsert(query, update, DataSourceDocument.class);
    }
}
