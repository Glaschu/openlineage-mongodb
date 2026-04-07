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

        // 2. Discover all schemas within the data source
        List<AlationSchema> schemas = client.getSchemasByDsId(dsId);
        if (schemas.isEmpty()) {
            log.info("No Alation schemas found for dsId={}. Skipping suggestion.", dsId);
            return;
        }

        log.info("Found {} OL datasets for namespace='{}', {} Alation schemas for dsId={}. Searching by name.",
                olDatasets.size(), openLineageNamespace, schemas.size(), dsId);

        int suggestedCount = 0;
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

            // 3. Search each schema for a table matching this OL dataset name
            AlationDataset bestMatch = null;
            double highestScore = 0.0;

            for (AlationSchema schema : schemas) {
                // If we extracted a schema hint, optionally prioritise matching schemas
                if (parsed.schemaHint != null) {
                    boolean schemaNameMatches = parsed.schemaHint.equalsIgnoreCase(schema.getName());
                    if (!schemaNameMatches) {
                        log.trace("Skipping Alation schema '{}' (doesn't match hint '{}')",
                                schema.getName(), parsed.schemaHint);
                        // Don't skip entirely — we'll still try if no hint-match succeeds
                    }
                }

                // Try the extracted table name first
                List<AlationDataset> matchingTables = client.searchTablesByName(schema.getId(), parsed.tableName);

                // If no result with the extracted table name and the original name is
                // different, fall back to searching with the full OL name
                if (matchingTables.isEmpty() && !parsed.tableName.equals(olName)) {
                    log.debug("No Alation match for tableName='{}' in schema='{}', retrying with full olName='{}'",
                            parsed.tableName, schema.getName(), olName);
                    matchingTables = client.searchTablesByName(schema.getId(), olName);
                }

                if (matchingTables.isEmpty()) {
                    continue;
                }

                log.debug("Found {} Alation table(s) in schema '{}' for OL dataset '{}'",
                        matchingTables.size(), schema.getName(), olName);

                for (AlationDataset alDataset : matchingTables) {
                    // Fetch columns only for this specific matched table
                    List<AlationColumn> tableColumns = client.getColumnsForTable(alDataset.getId());
                    double score = calculateMatchScore(olDataset, alDataset, tableColumns);

                    // Boost score if the schema name also matches
                    if (parsed.schemaHint != null
                            && parsed.schemaHint.equalsIgnoreCase(schema.getName())) {
                        score = Math.min(score + 0.1, 1.0);
                        log.debug("Schema hint '{}' matched Alation schema '{}', boosted score to {}",
                                parsed.schemaHint, schema.getName(), score);
                    }

                    if (score > highestScore) {
                        highestScore = score;
                        bestMatch = alDataset;
                    }
                }

                // If we found a strong match in this schema, no need to check other schemas
                if (highestScore >= 0.8) {
                    break;
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

        log.info("Completed mapping suggestions for namespace='{}': {} suggestions created",
                openLineageNamespace, suggestedCount);
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
