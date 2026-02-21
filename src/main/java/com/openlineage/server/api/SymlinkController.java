package com.openlineage.server.api;

import com.openlineage.server.api.models.DatasetResponse;
import com.openlineage.server.domain.Facet;
import com.openlineage.server.storage.document.DatasetDocument;
import com.openlineage.server.storage.document.InputDatasetFacetDocument;
import com.openlineage.server.storage.document.MarquezId;
import com.openlineage.server.storage.document.OutputDatasetFacetDocument;
import com.openlineage.server.storage.repository.DatasetRepository;
import com.openlineage.server.storage.repository.InputDatasetFacetRepository;
import com.openlineage.server.storage.repository.OutputDatasetFacetRepository;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v2/datasets/symlinks")
public class SymlinkController {

    private final MongoTemplate mongoTemplate;
    private final DatasetRepository datasetRepository;
    private final InputDatasetFacetRepository inputFacetRepository;
    private final OutputDatasetFacetRepository outputFacetRepository;
    private final com.openlineage.server.mapper.DatasetMapper datasetMapper;

    public SymlinkController(MongoTemplate mongoTemplate,
                             DatasetRepository datasetRepository,
                             InputDatasetFacetRepository inputFacetRepository,
                             OutputDatasetFacetRepository outputFacetRepository,
                             com.openlineage.server.mapper.DatasetMapper datasetMapper) {
        this.mongoTemplate = mongoTemplate;
        this.datasetRepository = datasetRepository;
        this.inputFacetRepository = inputFacetRepository;
        this.outputFacetRepository = outputFacetRepository;
        this.datasetMapper = datasetMapper;
    }

    @GetMapping("/{symlinkNamespace}")
    public DatasetResponse.DatasetsResponse listDatasetsBySymlinkNamespace(@PathVariable String symlinkNamespace) {
        Query query = new Query(Criteria.where("facets.symlinks.identifiers.namespace").is(symlinkNamespace));
        
        Set<MarquezId> datasetIds = new HashSet<>();
        
        List<InputDatasetFacetDocument> inputs = mongoTemplate.find(query, InputDatasetFacetDocument.class);
        for (InputDatasetFacetDocument doc : inputs) datasetIds.add(doc.getDatasetId());
        
        List<OutputDatasetFacetDocument> outputs = mongoTemplate.find(query, OutputDatasetFacetDocument.class);
        for (OutputDatasetFacetDocument doc : outputs) datasetIds.add(doc.getDatasetId());
        
        List<DatasetDocument> datasets = new ArrayList<>();
        datasetRepository.findAllById(datasetIds).forEach(datasets::add);
        
        List<DatasetResponse> responses = datasets.stream().map(this::mapDatasetFull).collect(Collectors.toList());
        return new DatasetResponse.DatasetsResponse(responses, responses.size());
    }

    private DatasetResponse mapDatasetFull(DatasetDocument doc) {
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
