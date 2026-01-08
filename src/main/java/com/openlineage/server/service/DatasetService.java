package com.openlineage.server.service;

import com.openlineage.server.domain.Dataset;
import com.openlineage.server.storage.DataSourceDocument;
import com.openlineage.server.storage.DataSourceRepository;
import com.openlineage.server.storage.DatasetDocument;
import com.openlineage.server.storage.DatasetRepository;
import com.openlineage.server.storage.MarquezId;
import org.springframework.stereotype.Service;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DatasetService {

    private final DatasetRepository datasetRepository;
    private final DataSourceRepository dataSourceRepository;
    private final FacetMergeService facetMergeService;

    public DatasetService(DatasetRepository datasetRepository,
            DataSourceRepository dataSourceRepository,
            FacetMergeService facetMergeService) {
        this.datasetRepository = datasetRepository;
        this.dataSourceRepository = dataSourceRepository;
        this.facetMergeService = facetMergeService;
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
        final List<Object> fields = extractedFields;
        String sourceName = dataset.namespace();

        DatasetDocument doc = datasetRepository.findById(new MarquezId(dataset.namespace(), dataset.name()))
                .orElseGet(() -> {
                    DatasetDocument newDoc = new DatasetDocument(dataset.namespace(), dataset.name(), sourceName,
                            fields, eventTime);
                    newDoc.setCreatedAt(eventTime);
                    return newDoc;
                });

        doc.setSourceName(sourceName);
        if (fields != null)
            doc.setFields(fields);
        doc.setUpdatedAt(eventTime);
        datasetRepository.save(doc);

        // 2. Merge Facets into Split Collections
        if (isInput) {
            facetMergeService.mergeInputFacets(dataset.namespace(), dataset.name(), dataset.facets(), eventTime);
        } else {
            facetMergeService.mergeOutputFacets(dataset.namespace(), dataset.name(), dataset.facets(), eventTime);
        }
    }

    public void upsertDataSource(String namespace, ZonedDateTime eventTime) {
        if (!dataSourceRepository.existsById(namespace)) {
            dataSourceRepository.save(new DataSourceDocument(namespace, namespace, eventTime));
        }
    }
}
