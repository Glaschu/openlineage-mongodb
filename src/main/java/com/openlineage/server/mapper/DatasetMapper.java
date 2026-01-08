package com.openlineage.server.mapper;

import com.openlineage.server.api.models.DatasetResponse;
import com.openlineage.server.domain.Facet;
import com.openlineage.server.domain.GenericFacet;
import com.openlineage.server.domain.SchemaDatasetFacet;
import com.openlineage.server.domain.ColumnLineageDatasetFacet;
import com.openlineage.server.storage.document.DatasetDocument;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class DatasetMapper {

    private final com.openlineage.server.storage.repository.DatasetRepository datasetRepository;

    public DatasetMapper(com.openlineage.server.storage.repository.DatasetRepository datasetRepository) {
        this.datasetRepository = datasetRepository;
    }

    public DatasetResponse toResponse(DatasetDocument doc) {
        return toResponse(doc, new HashMap<>());
    }

    public DatasetResponse toResponse(DatasetDocument doc, Map<String, Facet> facets) {
        return new DatasetResponse(
                new DatasetResponse.DatasetId(doc.getId().getNamespace(), doc.getId().getName()),
                "DB_TABLE",
                doc.getId().getName(),
                doc.getId().getName(),
                doc.getUpdatedAt(),
                doc.getUpdatedAt(),
                doc.getId().getNamespace(),
                doc.getSourceName(),
                doc.getFields(),
                doc.getTags(),
                doc.getUpdatedAt(),
                doc.getDescription(),
                mapColumnLineage(facets),
                facets,
                "",
                null,
                null);
    }

    public DatasetResponse toResponse(com.openlineage.server.domain.Dataset ds,
            com.openlineage.server.storage.document.RunDocument run, boolean isOutput) {
        List<Object> fields = Collections.emptyList();
        if (ds.facets() != null && ds.facets().containsKey("schema")) {
            Facet schemaFacet = ds.facets().get("schema");
            if (schemaFacet instanceof SchemaDatasetFacet) {
                fields = ((SchemaDatasetFacet) schemaFacet).fields().stream()
                        .map(f -> (Object) f)
                        .collect(Collectors.toList());
            }
        }

        String lifecycleState = null;
        if (ds.facets() != null && ds.facets().containsKey("lifecycleStateChange")) {
            Facet facet = ds.facets().get("lifecycleStateChange");
            if (facet instanceof GenericFacet) {
                Object val = ((GenericFacet) facet).getAdditionalProperties()
                        .get("lifecycleStateChange");
                if (val != null)
                    lifecycleState = val.toString();
            }
        }

        java.time.ZonedDateTime updatedAt = isOutput ? run.getEventTime() : null;
        com.openlineage.server.api.models.RunResponse createdBy = isOutput
                ? new com.openlineage.server.api.models.RunResponse(run.getRunId(), run.getCreatedAt(),
                        run.getUpdatedAt(), null, null, null, null, null,
                        null, Collections.emptyList(), Collections.emptyList(), Collections.emptyMap(),
                        Collections.emptyMap(), null)
                : null;

        java.time.ZonedDateTime createdAt = null;
        try {
            java.util.Optional<DatasetDocument> dsDoc = datasetRepository.findById(
                    new com.openlineage.server.storage.document.MarquezId(ds.namespace(), ds.name()));
            if (dsDoc.isPresent()) {
                createdAt = dsDoc.get().getCreatedAt();
            }
        } catch (Exception e) {
            // Ignore lookup failures
        }

        return new DatasetResponse(
                new DatasetResponse.DatasetId(ds.namespace(), ds.name()),
                "DB_TABLE",
                ds.name(),
                ds.name(),
                createdAt,
                updatedAt,
                ds.namespace(),
                ds.namespace(),
                fields,
                Collections.emptySet(),
                null,
                null,
                mapColumnLineage(ds.facets()),
                (Map<String, Facet>) ds.facets(),
                "",
                createdBy,
                lifecycleState);
    }

    public List<DatasetResponse.ColumnLineage> mapColumnLineage(Map<String, Facet> facets) {
        if (facets == null || !facets.containsKey("columnLineage")) {
            return Collections.emptyList();
        }
        Facet facet = facets.get("columnLineage");
        if (facet instanceof ColumnLineageDatasetFacet) {
            return ((ColumnLineageDatasetFacet) facet).fields().entrySet().stream()
                    .map(e -> new DatasetResponse.ColumnLineage(
                            e.getKey(),
                            e.getValue().inputFields(),
                            e.getValue().transformationDescription(),
                            e.getValue().transformationType()))
                    .collect(Collectors.toList());
        }
        return Collections.emptyList();
    }
}
