package com.openlineage.server.api;

import com.openlineage.server.domain.Facet;
import com.openlineage.server.storage.document.*;
import com.openlineage.server.storage.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/namespaces/{namespace}/datasets")
public class DatasetController {

    private final DatasetRepository repository;
    private final LineageEventRepository lineageEventRepository;
    private final InputDatasetFacetRepository inputFacetRepository;
    private final OutputDatasetFacetRepository outputFacetRepository;
    private final TagRepository tagRepository;
    private final com.openlineage.server.mapper.DatasetMapper datasetMapper;

    public DatasetController(DatasetRepository repository,
            LineageEventRepository lineageEventRepository,
            InputDatasetFacetRepository inputFacetRepository,
            OutputDatasetFacetRepository outputFacetRepository,
            TagRepository tagRepository,
            com.openlineage.server.mapper.DatasetMapper datasetMapper) {
        this.repository = repository;
        this.lineageEventRepository = lineageEventRepository;
        this.inputFacetRepository = inputFacetRepository;
        this.outputFacetRepository = outputFacetRepository;
        this.tagRepository = tagRepository;
        this.datasetMapper = datasetMapper;
    }

    @GetMapping
    public com.openlineage.server.api.models.DatasetResponse.DatasetsResponse listDatasets(
            @PathVariable String namespace) {
        List<com.openlineage.server.api.models.DatasetResponse> datasets = repository.findByIdNamespace(namespace)
                .stream()
                .map(this::mapDatasetSimple)
                .collect(java.util.stream.Collectors.toList());
        return new com.openlineage.server.api.models.DatasetResponse.DatasetsResponse(datasets, datasets.size());
    }

    @GetMapping("/{datasetName}")
    public com.openlineage.server.api.models.DatasetResponse getDataset(@PathVariable String namespace,
            @PathVariable String datasetName) {
        return repository.findById(new MarquezId(namespace, datasetName))
                .map(this::mapDatasetFull)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dataset not found"));
    }

    @GetMapping("/{datasetName}/versions")
    public com.openlineage.server.api.models.DatasetResponse.DatasetVersionsResponse listDatasetVersions(
            @PathVariable String namespace,
            @PathVariable String datasetName,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "0") int offset) {

        org.springframework.data.domain.PageRequest pageRequest = org.springframework.data.domain.PageRequest
                .of(offset / limit, limit, org.springframework.data.domain.Sort
                        .by(org.springframework.data.domain.Sort.Direction.DESC, "event.eventTime"));
        org.springframework.data.domain.Page<com.openlineage.server.storage.document.LineageEventDocument> events = lineageEventRepository
                .findByEventOutputsNamespaceAndEventOutputsName(namespace, datasetName, pageRequest);

        List<com.openlineage.server.api.models.DatasetResponse> versions = events.stream()
                .map(doc -> {
                    com.openlineage.server.domain.Dataset ds = doc.getEvent().outputs().stream()
                            .filter(d -> d.namespace().equals(namespace) && d.name().equals(datasetName))
                            .findFirst()
                            .orElseThrow(() -> new IllegalStateException("Dataset not found in event outputs"));

                    return mapEventToDatasetResponse(doc, ds, namespace, datasetName);
                })
                .collect(java.util.stream.Collectors.toList());

        return new com.openlineage.server.api.models.DatasetResponse.DatasetVersionsResponse(versions,
                (int) events.getTotalElements());
    }

    private com.openlineage.server.api.models.DatasetResponse mapEventToDatasetResponse(LineageEventDocument doc,
            com.openlineage.server.domain.Dataset ds, String namespace, String datasetName) {
        com.openlineage.server.api.models.RunResponse runResponse = new com.openlineage.server.api.models.RunResponse(
                doc.getEvent().run().runId(),
                doc.getEvent().eventTime(),
                doc.getEvent().eventTime(),
                null, null,
                "COMPLETED",
                doc.getEvent().eventTime(),
                doc.getEvent().eventTime(),
                null,
                java.util.Collections.emptyList(),
                java.util.Collections.emptyList(),
                java.util.Collections.emptyMap(),
                (java.util.Map<String, Object>) (java.util.Map) doc.getEvent().run().facets(),
                new com.openlineage.server.api.models.RunResponse.JobVersion(doc.getEvent().job().namespace(),
                        doc.getEvent().job().name(), "latest"));

        // Use mapper for column lineage only since we have it exposed
        return new com.openlineage.server.api.models.DatasetResponse(
                new com.openlineage.server.api.models.DatasetResponse.DatasetId(namespace, datasetName),
                "DB_TABLE",
                datasetName,
                datasetName,
                doc.getEvent().eventTime(),
                doc.getEvent().eventTime(),
                namespace,
                namespace,
                mapFields(ds),
                java.util.Collections.emptySet(),
                doc.getEvent().eventTime(),
                null,
                datasetMapper.mapColumnLineage(ds.facets()), // Reuse mapper
                (java.util.Map<String, Facet>) ds.facets(),
                doc.getEvent().run().runId(),
                runResponse,
                "active");
    }

    private java.util.List<Object> mapFields(com.openlineage.server.domain.Dataset ds) {
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
    public com.openlineage.server.api.models.DatasetResponse updateDataset(@PathVariable String namespace,
            @PathVariable String datasetName, @RequestBody DatasetDocument doc) {
        doc.setId(new MarquezId(namespace, datasetName));
        doc.setUpdatedAt(java.time.ZonedDateTime.now());
        return mapDatasetSimple(repository.save(doc));
    }

    @DeleteMapping("/{datasetName}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDataset(@PathVariable String namespace, @PathVariable String datasetName) {
        MarquezId id = new MarquezId(namespace, datasetName);
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dataset not found");
        }
        repository.deleteById(id);
        inputFacetRepository.deleteById(id);
        outputFacetRepository.deleteById(id);
    }

    @PostMapping("/{datasetName}/tags/{tag}")
    @ResponseStatus(HttpStatus.CREATED)
    public com.openlineage.server.api.models.DatasetResponse addTag(@PathVariable String namespace,
            @PathVariable String datasetName, @PathVariable String tag) {
        DatasetDocument doc = repository.findById(new MarquezId(namespace, datasetName))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dataset not found"));
        doc.getTags().add(tag);
        doc.setUpdatedAt(java.time.ZonedDateTime.now());

        if (!tagRepository.existsById(tag)) {
            tagRepository.save(new TagDocument(tag, null, java.time.ZonedDateTime.now()));
        }

        return mapDatasetSimple(repository.save(doc));
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

    private com.openlineage.server.api.models.DatasetResponse mapDatasetSimple(DatasetDocument doc) {
        return datasetMapper.toResponse(doc);
    }

    private com.openlineage.server.api.models.DatasetResponse mapDatasetFull(DatasetDocument doc) {
        Map<String, Facet> mergedFacets = new HashMap<>();

        Optional<InputDatasetFacetDocument> inputDoc = inputFacetRepository.findById(doc.getId());
        inputDoc.ifPresent(d -> {
            if (d.getFacets() != null)
                mergedFacets.putAll(d.getFacets());
        });

        Optional<OutputDatasetFacetDocument> outputDoc = outputFacetRepository.findById(doc.getId());
        outputDoc.ifPresent(d -> {
            if (d.getFacets() != null)
                mergedFacets.putAll(d.getFacets());
        });

        return datasetMapper.toResponse(doc, mergedFacets);
    }
}
