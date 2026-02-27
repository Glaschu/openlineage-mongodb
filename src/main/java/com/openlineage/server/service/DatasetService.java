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
    private final DatasetNameNormalizer nameNormalizer;

    public DatasetService(org.springframework.data.mongodb.core.MongoTemplate mongoTemplate,
            FacetMergeService facetMergeService, VersionService versionService,
            DatasetNameNormalizer nameNormalizer) {
        this.mongoTemplate = mongoTemplate;
        this.facetMergeService = facetMergeService;
        this.versionService = versionService;
        this.nameNormalizer = nameNormalizer;
    }

    public java.util.UUID upsertDataset(Dataset dataset, ZonedDateTime eventTime, boolean isInput) {
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
        String normalizedName = nameNormalizer.normalize(dataset.name());
        MarquezId datasetId = new MarquezId(dataset.namespace(), normalizedName);

        // Check for existing dataset to handle versioning logic
        DatasetDocument existingDataset = mongoTemplate.findById(datasetId, DatasetDocument.class);
        java.util.UUID contextVersion = versionService.computeDatasetVersion(dataset);

        // If there is no schema change (or empty schema in new event) but we have an
        // existing version, reuse it
        boolean hasSchema = extractedFields != null && !extractedFields.isEmpty();
        if (!hasSchema && existingDataset != null && existingDataset.getCurrentVersion() != null) {
            contextVersion = existingDataset.getCurrentVersion();
        }

        org.springframework.data.mongodb.core.query.Query query = org.springframework.data.mongodb.core.query.Query
                .query(org.springframework.data.mongodb.core.query.Criteria.where("_id")
                        .is(datasetId));

        org.springframework.data.mongodb.core.query.Update update = new org.springframework.data.mongodb.core.query.Update()
                .setOnInsert("createdAt", eventTime)
                .setOnInsert("searchName", normalizedName)
                .set("updatedAt", eventTime)
                .set("sourceName", sourceName)
                .set("isDeleted", false)
                .set("currentVersion", contextVersion);

        if (extractedFields != null) {
            update.set("fields", extractedFields);
        }

        if (dataset.facets() != null && !dataset.facets().isEmpty()) {
            for (java.util.Map.Entry<String, com.openlineage.server.domain.Facet> entry : dataset.facets().entrySet()) {
                update.set(
                        "facets." + com.openlineage.server.storage.document.DocumentDbSanitizer
                                .sanitizeKey(entry.getKey()),
                        com.openlineage.server.storage.document.DocumentDbSanitizer.sanitize(entry.getValue()));
            }

            // Extract Description
            if (dataset.facets().containsKey("documentation")) {
                com.openlineage.server.domain.Facet facet = dataset.facets().get("documentation");
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

        // 2. Preserve partition info stripped during name normalization
        java.util.Map<String, String> partitions = nameNormalizer.extractPartitions(dataset.name());
        if (!partitions.isEmpty()) {
            update.set("lastPartitionValues", partitions);
            // Store original raw name as a symlink identifier (deduped via $addToSet)
            java.util.Map<String, String> symlink = new java.util.LinkedHashMap<>();
            symlink.put("namespace", dataset.namespace());
            symlink.put("name", dataset.name());
            symlink.put("type", "partition");
            update.addToSet("symlinks", symlink);
        }

        mongoTemplate.upsert(query, update, DatasetDocument.class);

        // 3. Normalize column lineage InputField names, then merge facets into split
        // collections
        java.util.Map<String, com.openlineage.server.domain.Facet> normalizedFacets = normalizeColumnLineageFacets(
                dataset.facets());
        if (isInput) {
            facetMergeService.mergeInputFacets(dataset.namespace(), normalizedName, normalizedFacets, eventTime);
        } else {
            facetMergeService.mergeOutputFacets(dataset.namespace(), normalizedName, normalizedFacets, eventTime);
        }

        return contextVersion;
    }

    /**
     * Returns a copy of the facets map where any {@code columnLineage} facet has
     * its
     * {@link com.openlineage.server.domain.ColumnLineageDatasetFacet.InputField}
     * dataset names normalized.
     * This ensures that column-level lineage references point to the canonical
     * (normalized) dataset identity.
     */
    private java.util.Map<String, com.openlineage.server.domain.Facet> normalizeColumnLineageFacets(
            java.util.Map<String, com.openlineage.server.domain.Facet> facets) {
        if (facets == null || !facets.containsKey("columnLineage")) {
            return facets;
        }
        com.openlineage.server.domain.Facet facet = facets.get("columnLineage");
        if (!(facet instanceof com.openlineage.server.domain.ColumnLineageDatasetFacet colFacet)) {
            return facets;
        }
        if (colFacet.fields() == null || colFacet.fields().isEmpty()) {
            return facets;
        }

        java.util.Map<String, com.openlineage.server.domain.ColumnLineageDatasetFacet.Fields> normalizedFields = new java.util.LinkedHashMap<>();
        for (java.util.Map.Entry<String, com.openlineage.server.domain.ColumnLineageDatasetFacet.Fields> entry : colFacet
                .fields().entrySet()) {
            com.openlineage.server.domain.ColumnLineageDatasetFacet.Fields fields = entry.getValue();
            if (fields.inputFields() == null || fields.inputFields().isEmpty()) {
                normalizedFields.put(entry.getKey(), fields);
                continue;
            }
            List<com.openlineage.server.domain.ColumnLineageDatasetFacet.InputField> normalizedInputs = fields
                    .inputFields().stream()
                    .map(inp -> new com.openlineage.server.domain.ColumnLineageDatasetFacet.InputField(
                            inp.namespace(), nameNormalizer.normalize(inp.name()), inp.field()))
                    .collect(Collectors.toList());
            normalizedFields.put(entry.getKey(),
                    new com.openlineage.server.domain.ColumnLineageDatasetFacet.Fields(normalizedInputs,
                            fields.transformationDescription(), fields.transformationType()));
        }

        java.util.Map<String, com.openlineage.server.domain.Facet> result = new java.util.HashMap<>(facets);
        result.put("columnLineage", new com.openlineage.server.domain.ColumnLineageDatasetFacet(normalizedFields));
        return result;
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
