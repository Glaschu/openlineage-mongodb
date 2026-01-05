package com.openlineage.server.api;

import com.openlineage.server.storage.DatasetDocument;
import com.openlineage.server.storage.DatasetRepository;
import com.openlineage.server.storage.LineageEventRepository;
import com.openlineage.server.storage.MarquezId;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/namespaces/{namespace}/datasets")
public class DatasetController {

    private final DatasetRepository repository;
    private final LineageEventRepository lineageEventRepository;

    public DatasetController(DatasetRepository repository, LineageEventRepository lineageEventRepository) {
        this.repository = repository;
        this.lineageEventRepository = lineageEventRepository;
    }

    @GetMapping
    public com.openlineage.server.api.models.DatasetResponse.DatasetsResponse listDatasets(@PathVariable String namespace) {
        List<com.openlineage.server.api.models.DatasetResponse> datasets = repository.findByIdNamespace(namespace).stream()
            .map(this::toResponse)
            .collect(java.util.stream.Collectors.toList());
        return new com.openlineage.server.api.models.DatasetResponse.DatasetsResponse(datasets, datasets.size());
    }

    @GetMapping("/{datasetName}")
    public com.openlineage.server.api.models.DatasetResponse getDataset(@PathVariable String namespace, @PathVariable String datasetName) {
        return repository.findById(new MarquezId(namespace, datasetName))
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dataset not found"));
    }

    @GetMapping("/{datasetName}/versions")
    public com.openlineage.server.api.models.DatasetResponse.DatasetVersionsResponse listDatasetVersions(
            @PathVariable String namespace,
            @PathVariable String datasetName,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        
        org.springframework.data.domain.PageRequest pageRequest = org.springframework.data.domain.PageRequest.of(offset / limit, limit, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "event.eventTime"));
        org.springframework.data.domain.Page<com.openlineage.server.storage.LineageEventDocument> events = lineageEventRepository.findByEventOutputsNamespaceAndEventOutputsName(namespace, datasetName, pageRequest);

        List<com.openlineage.server.api.models.DatasetResponse> versions = events.stream()
                .map(doc -> {
                    // Extract the specific dataset from outputs
                    com.openlineage.server.domain.Dataset ds = doc.getEvent().outputs().stream()
                            .filter(d -> d.namespace().equals(namespace) && d.name().equals(datasetName))
                            .findFirst()
                            .orElseThrow(() -> new IllegalStateException("Dataset not found in event outputs despite query match"));
                    
                    com.openlineage.server.api.models.RunResponse runResponse = new com.openlineage.server.api.models.RunResponse(
                        doc.getEvent().run().runId(),
                        doc.getEvent().eventTime(),
                        doc.getEvent().eventTime(),
                        null, null,
                        "COMPLETED", // Assume completed if it produced a dataset version
                        doc.getEvent().eventTime(),
                        doc.getEvent().eventTime(),
                        null,
                        java.util.Collections.emptyList(), // inputs
                        java.util.Collections.emptyList(), // outputs - could map from event outputs but might recurse
                        java.util.Collections.emptyMap(),
                        (java.util.Map<String, Object>) (java.util.Map) doc.getEvent().run().facets(),
                        new com.openlineage.server.api.models.RunResponse.JobVersion(doc.getEvent().job().namespace(), doc.getEvent().job().name(), "latest")
                    );

                    return new com.openlineage.server.api.models.DatasetResponse(
                        new com.openlineage.server.api.models.DatasetResponse.DatasetId(namespace, datasetName),
                        "DB_TABLE",
                        datasetName, // Name
                        datasetName, // Physical Name
                        doc.getEvent().eventTime(), // createdAt (version time)
                        doc.getEvent().eventTime(), // updatedAt
                        namespace,
                        namespace, // Source Name
                        mapFields(ds),
                        java.util.Collections.emptySet(),
                        doc.getEvent().eventTime(), // lastModifiedAt
                        null, // description
                        mapColumnLineage(ds.facets()),
                        (java.util.Map<String, com.openlineage.server.domain.Facet>) ds.facets(),
                        doc.getEvent().run().runId(), // Simple version using runId for now
                        runResponse,
                        "active" // lifecycleState
                    );
                })
                .collect(java.util.stream.Collectors.toList());

        return new com.openlineage.server.api.models.DatasetResponse.DatasetVersionsResponse(versions, (int) events.getTotalElements());
    }

    private List<Object> mapFields(com.openlineage.server.domain.Dataset ds) {
        if (ds.facets() != null && ds.facets().containsKey("schema")) {
             com.openlineage.server.domain.Facet schemaFacet = ds.facets().get("schema");
             if (schemaFacet instanceof com.openlineage.server.domain.SchemaDatasetFacet) {
                 return ((com.openlineage.server.domain.SchemaDatasetFacet) schemaFacet).fields().stream()
                     .map(f -> (Object) f)
                     .collect(java.util.stream.Collectors.toList());
             }
        }
        return java.util.Collections.emptyList();
    }


    @PutMapping("/{datasetName}")
    public com.openlineage.server.api.models.DatasetResponse updateDataset(@PathVariable String namespace, @PathVariable String datasetName, @RequestBody DatasetDocument doc) {
        doc.setId(new MarquezId(namespace, datasetName));
        doc.setUpdatedAt(java.time.ZonedDateTime.now());
        return toResponse(repository.save(doc));
    }

    @DeleteMapping("/{datasetName}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDataset(@PathVariable String namespace, @PathVariable String datasetName) {
        MarquezId id = new MarquezId(namespace, datasetName);
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dataset not found");
        }
        repository.deleteById(id);
    }

    @PostMapping("/{datasetName}/tags/{tag}")
    @ResponseStatus(HttpStatus.CREATED)
    public com.openlineage.server.api.models.DatasetResponse addTag(@PathVariable String namespace, @PathVariable String datasetName, @PathVariable String tag) {
        DatasetDocument doc = repository.findById(new MarquezId(namespace, datasetName))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dataset not found"));
        doc.getTags().add(tag);
        doc.setUpdatedAt(java.time.ZonedDateTime.now());
        return toResponse(repository.save(doc));
    }

    @DeleteMapping("/{datasetName}/tags/{tag}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTag(@PathVariable String namespace, @PathVariable String datasetName, @PathVariable String tag) {
         DatasetDocument doc = repository.findById(new MarquezId(namespace, datasetName))
                 .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dataset not found"));
         if (doc.getTags().remove(tag)) {
             doc.setUpdatedAt(java.time.ZonedDateTime.now());
             repository.save(doc);
         }
    }

    private com.openlineage.server.api.models.DatasetResponse toResponse(DatasetDocument doc) {
        return new com.openlineage.server.api.models.DatasetResponse(
            new com.openlineage.server.api.models.DatasetResponse.DatasetId(doc.getId().getNamespace(), doc.getId().getName()),
            "DB_TABLE", // Type - needs logic or storage, default for now
            doc.getId().getName(),
            doc.getId().getName(), // Physical Name
            doc.getUpdatedAt(), // createdAt
            doc.getUpdatedAt(),
            doc.getId().getNamespace(),
            doc.getSourceName(),
            doc.getFields(),
            doc.getTags(),
            doc.getUpdatedAt(), // lastModifiedAt
            doc.getDescription(), // description
            mapColumnLineage(doc.getFacets()),
            doc.getFacets(),
            "", // version - not applicable for dataset container
            null, // createdByRun
            null // lifecycleState
        );
    }

    private java.util.List<com.openlineage.server.api.models.DatasetResponse.ColumnLineage> mapColumnLineage(java.util.Map<String, com.openlineage.server.domain.Facet> facets) {
        if (facets == null || !facets.containsKey("columnLineage")) {
            return java.util.Collections.emptyList();
        }
        com.openlineage.server.domain.Facet facet = facets.get("columnLineage");
        if (facet instanceof com.openlineage.server.domain.ColumnLineageDatasetFacet) {
            return ((com.openlineage.server.domain.ColumnLineageDatasetFacet) facet).fields().entrySet().stream()
                .map(e -> new com.openlineage.server.api.models.DatasetResponse.ColumnLineage(
                    e.getKey(),
                    e.getValue().inputFields(),
                    e.getValue().transformationDescription(),
                    e.getValue().transformationType()
                ))
                .collect(java.util.stream.Collectors.toList());
        }
        return java.util.Collections.emptyList();
    }
}
