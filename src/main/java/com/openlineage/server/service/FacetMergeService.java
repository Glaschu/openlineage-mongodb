package com.openlineage.server.service;

import com.openlineage.server.domain.Facet;
import com.openlineage.server.domain.SchemaDatasetFacet;
import com.openlineage.server.storage.InputDatasetFacetDocument;
import com.openlineage.server.storage.InputDatasetFacetRepository;
import com.openlineage.server.storage.MarquezId;
import com.openlineage.server.storage.OutputDatasetFacetDocument;
import com.openlineage.server.storage.OutputDatasetFacetRepository;
import org.springframework.stereotype.Service;

import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FacetMergeService {

    private final InputDatasetFacetRepository inputRepository;
    private final OutputDatasetFacetRepository outputRepository;

    public FacetMergeService(InputDatasetFacetRepository inputRepository,
            OutputDatasetFacetRepository outputRepository) {
        this.inputRepository = inputRepository;
        this.outputRepository = outputRepository;
    }

    public void mergeInputFacets(String namespace, String name, Map<String, Facet> newFacets, ZonedDateTime eventTime) {
        MarquezId id = new MarquezId(namespace, name);
        InputDatasetFacetDocument doc = inputRepository.findById(id)
                .orElse(new InputDatasetFacetDocument(id, new HashMap<>(), eventTime));

        mergeFacets(doc.getFacets(), newFacets);
        doc.setUpdatedAt(eventTime);
        inputRepository.save(doc);
    }

    public void mergeOutputFacets(String namespace, String name, Map<String, Facet> newFacets,
            ZonedDateTime eventTime) {
        MarquezId id = new MarquezId(namespace, name);
        OutputDatasetFacetDocument doc = outputRepository.findById(id)
                .orElse(new OutputDatasetFacetDocument(id, new HashMap<>(), eventTime));

        mergeFacets(doc.getFacets(), newFacets);
        doc.setUpdatedAt(eventTime);
        outputRepository.save(doc);
    }

    private void mergeFacets(Map<String, Facet> existing, Map<String, Facet> incoming) {
        if (incoming == null)
            return;

        for (Map.Entry<String, Facet> entry : incoming.entrySet()) {
            String key = entry.getKey();
            Facet newFacet = entry.getValue();

            if (existing.containsKey(key)) {
                Facet existingFacet = existing.get(key);
                existing.put(key, merge(existingFacet, newFacet));
            } else {
                existing.put(key, newFacet);
            }
        }
    }

    private Facet merge(Facet existing, Facet incoming) {
        // Special logic for SchemaDatasetFacet
        if (existing instanceof SchemaDatasetFacet && incoming instanceof SchemaDatasetFacet) {
            return mergeSchema((SchemaDatasetFacet) existing, (SchemaDatasetFacet) incoming);
        }
        // Default: Last write wins (or could be smarter)
        return incoming;
    }

    private SchemaDatasetFacet mergeSchema(SchemaDatasetFacet existing, SchemaDatasetFacet incoming) {
        // Merge fields based on name
        Map<String, SchemaDatasetFacet.SchemaField> fieldMap = new HashMap<>();

        if (existing.fields() != null) {
            existing.fields().forEach(f -> fieldMap.put(f.name(), f));
        }
        if (incoming.fields() != null) {
            incoming.fields().forEach(f -> fieldMap.put(f.name(), f)); // Overwrite or merge? Priority to incoming for
                                                                       // updates?
        }

        return new SchemaDatasetFacet(
                new ArrayList<>(fieldMap.values()));
    }
}
