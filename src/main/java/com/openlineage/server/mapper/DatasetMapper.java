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

    /**
     * Lightweight mapping for list endpoints: columnLineage is [] if present, null
     * if absent.
     */
    public DatasetResponse toResponse(DatasetDocument doc, boolean hasColumnLineage) {
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
                doc.getTags() != null ? doc.getTags() : Collections.emptySet(),
                doc.getUpdatedAt(),
                doc.getDescription(),
                hasColumnLineage ? Collections.emptyList() : null,
                Collections.emptyMap(),
                "",
                null,
                null,
                doc.getIsDeleted() != null ? doc.getIsDeleted() : false,
                doc.getCurrentVersion());
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
                doc.getTags() != null ? doc.getTags() : Collections.emptySet(),
                doc.getUpdatedAt(),
                doc.getDescription(),
                mapColumnLineage(facets),
                facets,
                "",
                null,
                null,
                doc.getIsDeleted() != null ? doc.getIsDeleted() : false,
                doc.getCurrentVersion());
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
                        null,
                        mapDatasets(run.getInputs()), // inputs
                        mapDatasets(run.getOutputs()), // outputs
                        Collections.emptyList(), Collections.emptyList(),
                        Collections.emptyMap(),
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

        String version = "";
        if (ds.facets() != null && ds.facets().containsKey("version")) {
            Facet facet = ds.facets().get("version");
            if (facet instanceof GenericFacet) {
                Object val = ((GenericFacet) facet).getAdditionalProperties().get("datasetVersion");
                if (val != null) {
                    version = val.toString();
                }
            }
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
                Collections.emptySet(), // Tags currently not standard in OL events
                null,
                null,
                mapColumnLineage(ds.facets()),
                (Map<String, Facet>) ds.facets(),
                version,
                createdBy,
                lifecycleState,
                false, // isDeleted
                null // currentVersion
        );
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

    private java.util.List<DatasetResponse> mapDatasetIds(
            java.util.Set<com.openlineage.server.storage.document.MarquezId> ids) {
        if (ids == null)
            return Collections.emptyList();
        return ids.stream()
                .map(id -> new DatasetResponse(
                        new DatasetResponse.DatasetId(id.getNamespace(), id.getName()),
                        "DB_TABLE", id.getName(), id.getName(), null, null, id.getNamespace(), id.getNamespace(),
                        Collections.emptyList(), Collections.emptySet(), null, null, Collections.emptyList(),
                        Collections.emptyMap(), "", null, null, false, null))
                .collect(Collectors.toList());
    }

    private java.util.List<DatasetResponse> mapDatasets(
            java.util.List<com.openlineage.server.domain.Dataset> datasets) {
        if (datasets == null)
            return Collections.emptyList();
        return datasets.stream()
                .map(ds -> new DatasetResponse(
                        new DatasetResponse.DatasetId(ds.namespace(), ds.name()),
                        "DB_TABLE", ds.name(), ds.name(), null, null, ds.namespace(), ds.namespace(),
                        Collections.emptyList(), Collections.emptySet(), null, null, Collections.emptyList(),
                        Collections.emptyMap(), "", null, null, false, null))
                .collect(Collectors.toList());
    }
}
