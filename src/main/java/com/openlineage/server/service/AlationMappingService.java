package com.openlineage.server.service;

import com.openlineage.server.domain.alation.AlationColumn;
import com.openlineage.server.domain.alation.AlationDataset;
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
import java.util.stream.Collectors;

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

    public void suggestMappingsForSchema(String openLineageNamespace, Long alationSchemaId) {
        if (alationClientService.isEmpty()) {
            log.warn("Alation client is not configured (alation.host not set). Cannot suggest mappings.");
            throw new IllegalStateException("Alation integration is not configured");
        }

        AlationClientService client = alationClientService.get();

        List<DatasetDocument> olDatasets = datasetRepository
                .findByIdNamespace(openLineageNamespace, Pageable.unpaged())
                .getContent();

        if (olDatasets.isEmpty()) {
            log.info("No OpenLineage datasets found for namespace='{}'. Skipping suggestion.", openLineageNamespace);
            return;
        }

        log.info("Found {} OpenLineage datasets for namespace='{}'. Fetching Alation datasets for schemaId={}",
                olDatasets.size(), openLineageNamespace, alationSchemaId);

        List<AlationDataset> alationDatasets = client.getDatasetsBySchema(alationSchemaId);
        if (alationDatasets.isEmpty()) {
            log.info("No Alation datasets found for schemaId={}. Skipping suggestion.", alationSchemaId);
            return;
        }

        List<AlationColumn> allAlationColumns = client.getColumnsForSchema(alationSchemaId);

        List<AlationDatasetMappingDocument> existingMappings = mappingRepository
                .findByOpenLineageNamespace(openLineageNamespace);

        int suggestedCount = 0;
        for (DatasetDocument olDataset : olDatasets) {
            String olName = olDataset.getId().getName();

            // Skip if already ACCEPTED
            boolean alreadyAccepted = existingMappings.stream()
                    .anyMatch(m -> m.getOpenLineageDatasetName().equals(olName)
                            && m.getStatus() == MappingStatus.ACCEPTED);
            if (alreadyAccepted)
                continue;

            AlationDataset bestMatch = null;
            double highestScore = 0.0;

            for (AlationDataset alDataset : alationDatasets) {
                double score = calculateMatchScore(olDataset, alDataset, allAlationColumns);
                if (score > highestScore) {
                    highestScore = score;
                    bestMatch = alDataset;
                }
            }

            if (bestMatch != null && highestScore > 0.4) {
                saveSuggestion(openLineageNamespace, olName, bestMatch, highestScore);
                suggestedCount++;
            }
        }

        log.info("Completed mapping suggestions for namespace='{}': {} suggestions created",
                openLineageNamespace, suggestedCount);
    }

    private double calculateMatchScore(DatasetDocument olDataset, AlationDataset alDataset,
            List<AlationColumn> allAlationColumns) {
        double score = 0.0;
        String olName = olDataset.getId().getName();
        String alName = alDataset.getName() != null ? alDataset.getName() : alDataset.getNameInDatasource();

        if (alName == null)
            return 0.0;

        // 1. Name exact match
        if (olName.equalsIgnoreCase(alName)) {
            score += 0.8;
        } else if (olName.toLowerCase().contains(alName.toLowerCase())
                || alName.toLowerCase().contains(olName.toLowerCase())) {
            score += 0.4; // Partial match
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
                            .filter(c -> c.getDatasetId().equals(alDataset.getId()))
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
}
