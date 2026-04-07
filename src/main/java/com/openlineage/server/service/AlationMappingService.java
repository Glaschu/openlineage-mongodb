package com.openlineage.server.service;

import com.openlineage.server.domain.alation.AlationColumn;
import com.openlineage.server.domain.alation.AlationDataset;
import com.openlineage.server.domain.alation.AlationSchema;
import com.openlineage.server.storage.document.AlationDatasetMappingDocument;
import com.openlineage.server.storage.document.DatasetDocument;
import com.openlineage.server.storage.document.MappingStatus;
import com.openlineage.server.storage.document.OutputDatasetFacetDocument;
import com.openlineage.server.storage.repository.AlationMappingRepository;
import com.openlineage.server.storage.repository.DatasetRepository;
import com.openlineage.server.storage.repository.OutputDatasetFacetRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AlationMappingService {

    private static final Logger log = LoggerFactory.getLogger(AlationMappingService.class);

    private final AlationMappingRepository mappingRepository;
    private final Optional<AlationClientService> alationClientService;
    private final DatasetRepository datasetRepository;
    private final OutputDatasetFacetRepository outputFacetRepository;

    public AlationMappingService(AlationMappingRepository mappingRepository,
            Optional<AlationClientService> alationClientService,
            DatasetRepository datasetRepository,
            OutputDatasetFacetRepository outputFacetRepository) {
        this.mappingRepository = mappingRepository;
        this.alationClientService = alationClientService;
        this.datasetRepository = datasetRepository;
        this.outputFacetRepository = outputFacetRepository;
    }

    public void suggestMappingsForDataSource(String openLineageNamespace, Long dsId) {
        if (alationClientService.isEmpty()) {
            log.warn("Alation client is not configured (alation.host not set). Cannot suggest mappings.");
            throw new IllegalStateException("Alation integration is not configured");
        }

        AlationClientService client = alationClientService.get();

        // 1. Load OL datasets for the given namespace
        List<DatasetDocument> olDatasets = datasetRepository
                .findByIdNamespace(openLineageNamespace, Pageable.unpaged())
                .getContent();

        if (olDatasets.isEmpty()) {
            log.info("No OpenLineage datasets found for namespace='{}'. Skipping suggestion.", openLineageNamespace);
            return;
        }

        List<AlationDatasetMappingDocument> existingMappings = mappingRepository
                .findByOpenLineageNamespace(openLineageNamespace);

        // 2. Build a schema lookup map for score boosting (schema_id -> schema_name)
        //    This is a single API call regardless of how many schemas exist.
        Map<Long, String> schemaNameById = new java.util.HashMap<>();
        List<AlationSchema> schemas = client.getSchemasByDsId(dsId);
        for (AlationSchema schema : schemas) {
            schemaNameById.put(schema.getId(), schema.getName());
        }

        log.info("Found {} OL datasets for namespace='{}', {} Alation schemas for dsId={}. Searching by name.",
                olDatasets.size(), openLineageNamespace, schemas.size(), dsId);

        int suggestedCount = 0;
        int apiCallCount = 0;

        for (DatasetDocument olDataset : olDatasets) {
            String olName = olDataset.getId().getName();

            // Skip if already ACCEPTED
            boolean alreadyAccepted = existingMappings.stream()
                    .anyMatch(m -> m.getOpenLineageDatasetName().equals(olName)
                            && m.getStatus() == MappingStatus.ACCEPTED);
            if (alreadyAccepted)
                continue;

            // Parse the OL dataset name into components.
            // OL names can be qualified: "uscb_db.cust_l", "schema.table",
            // or path-like: "db/schema/table"
            NameComponents parsed = parseOlDatasetName(olName);
            log.debug("OL dataset '{}' parsed -> tableName='{}', schemaHint='{}'",
                    olName, parsed.tableName, parsed.schemaHint);

            // 3. Search across the entire data source by name (single API call)
            List<AlationDataset> matchingTables = client.searchTablesByNameInDataSource(dsId, parsed.tableName);
            apiCallCount++;

            // If no result with the extracted table name and the original name is
            // different, fall back to searching with the full OL name
            if (matchingTables.isEmpty() && !parsed.tableName.equals(olName)) {
                log.debug("No Alation match for tableName='{}', retrying with full olName='{}'",
                        parsed.tableName, olName);
                matchingTables = client.searchTablesByNameInDataSource(dsId, olName);
                apiCallCount++;
            }

            if (matchingTables.isEmpty()) {
                log.debug("No Alation tables found for OL dataset '{}'", olName);
                continue;
            }

            log.debug("Found {} Alation table(s) for OL dataset '{}'", matchingTables.size(), olName);

            // 4. Score each matching table
            AlationDataset bestMatch = null;
            double highestScore = 0.0;

            for (AlationDataset alDataset : matchingTables) {
                // Fetch columns only for this specific matched table
                List<AlationColumn> tableColumns = client.getColumnsForTable(alDataset.getId());
                apiCallCount++;

                double score = calculateMatchScore(olDataset, alDataset, tableColumns);

                // Boost score if the schema name matches the parsed schema hint
                if (parsed.schemaHint != null && alDataset.getSchemaId() != null) {
                    String alSchemaName = schemaNameById.get(alDataset.getSchemaId());
                    if (parsed.schemaHint.equalsIgnoreCase(alSchemaName)) {
                        score = Math.min(score + 0.1, 1.0);
                        log.debug("Schema hint '{}' matched Alation schema '{}', boosted score to {}",
                                parsed.schemaHint, alSchemaName, score);
                    }
                }

                if (score > highestScore) {
                    highestScore = score;
                    bestMatch = alDataset;
                }
            }

            if (bestMatch != null && highestScore > 0.4) {
                saveSuggestion(openLineageNamespace, olName, bestMatch, highestScore);
                suggestedCount++;
            } else {
                log.debug("No match above threshold for OL dataset '{}' (bestScore={})",
                        olName, highestScore);
            }
        }

        log.info("Completed mapping suggestions for namespace='{}': {} suggestions created, {} Alation API calls made",
                openLineageNamespace, suggestedCount, apiCallCount);
    }

    private double calculateMatchScore(DatasetDocument olDataset, AlationDataset alDataset,
            List<AlationColumn> allAlationColumns) {
        double score = 0.0;
        String olName = olDataset.getId().getName();
        NameComponents parsed = parseOlDatasetName(olName);
        String alName = alDataset.getName() != null ? alDataset.getName() : alDataset.getNameInDatasource();

        if (alName == null)
            return 0.0;

        log.debug("Comparing OL='{}' (tableName='{}') vs Alation='{}'", olName, parsed.tableName, alName);

        // 1. Name matching — compare the extracted table name against the Alation name
        if (parsed.tableName.equalsIgnoreCase(alName)) {
            score += 0.8; // Exact table name match
        } else if (olName.equalsIgnoreCase(alName)) {
            score += 0.8; // Full qualified name match
        } else if (parsed.tableName.toLowerCase().contains(alName.toLowerCase())
                || alName.toLowerCase().contains(parsed.tableName.toLowerCase())) {
            score += 0.4; // Partial match
        } else if (olName.toLowerCase().contains(alName.toLowerCase())
                || alName.toLowerCase().contains(olName.toLowerCase())) {
            score += 0.3; // Weaker partial match on full name
        }

        // 2. Schema/Column matching
        Optional<OutputDatasetFacetDocument> facetOpt = outputFacetRepository.findById(olDataset.getId());
        if (facetOpt.isPresent() && facetOpt.get().getFacets() != null) {
            Object schemaFacet = facetOpt.get().getFacets().get("schema");
            if (schemaFacet instanceof Map) {
                Object fieldsObj = ((Map<?, ?>) schemaFacet).get("fields");
                if (fieldsObj instanceof List) {
                    List<?> olFields = (List<?>) fieldsObj;
                    List<String> alationColNames = allAlationColumns.stream()
                            .filter(c -> c.getTableId() != null && c.getTableId().equals(alDataset.getId()))
                            .map(c -> c.getName() != null ? c.getName().toLowerCase() : "")
                            .toList();

                    int matchCount = 0;
                    for (Object fieldObj : olFields) {
                        if (fieldObj instanceof Map) {
                            String fieldName = (String) ((Map<?, ?>) fieldObj).get("name");
                            if (fieldName != null && alationColNames.contains(fieldName.toLowerCase())) {
                                matchCount++;
                            }
                        }
                    }
                    if (!olFields.isEmpty()) {
                        double columnMatchRatio = (double) matchCount / olFields.size();
                        score += (columnMatchRatio * 0.5);
                    }
                }
            }
        }

        return Math.min(score, 1.0);
    }

    private void saveSuggestion(String olNamespace, String olName, AlationDataset bestMatch, double score) {
        String id = olNamespace + ":" + olName;
        AlationDatasetMappingDocument doc = mappingRepository.findById(id)
                .orElse(new AlationDatasetMappingDocument());

        // Don't overwrite if it's already rejected or accepted
        if (doc.getStatus() == MappingStatus.ACCEPTED || doc.getStatus() == MappingStatus.REJECTED) {
            return;
        }

        doc.setId(id);
        doc.setOpenLineageNamespace(olNamespace);
        doc.setOpenLineageDatasetName(olName);
        doc.setAlationDatasetId(bestMatch.getId());
        doc.setAlationDatasetName(
                bestMatch.getName() != null ? bestMatch.getName() : bestMatch.getNameInDatasource());
        doc.setConfidenceScore(score);
        doc.setStatus(MappingStatus.SUGGESTED);
        doc.setUpdatedAt(Instant.now());
        if (doc.getCreatedAt() == null) {
            doc.setCreatedAt(Instant.now());
        }

        mappingRepository.save(doc);
        log.debug("Saved mapping suggestion: OL='{}:{}' -> Alation='{}' (score={})",
                olNamespace, olName, doc.getAlationDatasetName(), score);
    }

    // ── Name Parsing Helpers ────────────────────────────────────

    /**
     * Parse an OpenLineage dataset name into its components.
     * <p>
     * OL names can be qualified in several ways:
     * <ul>
     *   <li>Dot-separated: {@code uscb_db.cust_l} → schema=uscb_db, table=cust_l</li>
     *   <li>Path-like:      {@code db/schema/table} → schema=schema, table=table</li>
     *   <li>Simple:         {@code cust_l} → schema=null, table=cust_l</li>
     * </ul>
     */
    static NameComponents parseOlDatasetName(String olName) {
        if (olName == null || olName.isEmpty()) {
            return new NameComponents(olName, null);
        }

        // Try dot-separated first (most common for databases)
        if (olName.contains(".")) {
            String[] parts = olName.split("\\.");
            String tableName = parts[parts.length - 1];
            // Schema hint is the second-to-last segment if present
            String schemaHint = parts.length >= 2 ? parts[parts.length - 2] : null;
            return new NameComponents(tableName, schemaHint);
        }

        // Try path-separated
        if (olName.contains("/")) {
            String[] parts = olName.split("/");
            String tableName = parts[parts.length - 1];
            String schemaHint = parts.length >= 2 ? parts[parts.length - 2] : null;
            return new NameComponents(tableName, schemaHint);
        }

        // Simple unqualified name
        return new NameComponents(olName, null);
    }

    static class NameComponents {
        final String tableName;
        final String schemaHint;

        NameComponents(String tableName, String schemaHint) {
            this.tableName = tableName;
            this.schemaHint = schemaHint;
        }
    }
}
