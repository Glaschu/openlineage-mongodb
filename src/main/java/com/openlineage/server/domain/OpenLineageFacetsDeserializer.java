package com.openlineage.server.domain;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

/**
 * Custom Jackson deserializer for OpenLineage facet maps.
 * 
 * Maps well-known facet keys to strongly-typed POJOs for structured access,
 * while preserving all unknown/custom facets via GenericFacet (no data loss).
 * 
 * Supported typed facets:
 * - Dataset: schema, ownership, columnLineage, documentation, dataSource, storage, lifecycleStateChange, symlinks
 * - Job: documentation, sql, sourceCodeLocation
 * - Run: (all handled as GenericFacet — run facets are highly variable)
 */
public class OpenLineageFacetsDeserializer extends JsonDeserializer<Map<String, Facet>> {

    // Mapping of facet key → typed class for known facets
    private static final Map<String, Class<? extends Facet>> TYPED_FACETS = Map.ofEntries(
            // Dataset facets
            Map.entry("schema", SchemaDatasetFacet.class),
            Map.entry("ownership", OwnershipDatasetFacet.class),
            Map.entry("columnLineage", ColumnLineageDatasetFacet.class),
            Map.entry("documentation", DocumentationFacet.class),
            Map.entry("dataSource", DataSourceDatasetFacet.class),
            Map.entry("storage", StorageDatasetFacet.class),
            Map.entry("lifecycleStateChange", LifecycleStateChangeDatasetFacet.class),
            Map.entry("symlinks", SymlinksDatasetFacet.class),
            // Job facets
            Map.entry("sql", SqlJobFacet.class),
            Map.entry("sourceCodeLocation", SourceCodeLocationJobFacet.class)
    );

    @Override
    public Map<String, Facet> deserialize(JsonParser p, DeserializationContext ctxt) throws IOException, JsonProcessingException {
        ObjectMapper mapper = (ObjectMapper) p.getCodec();
        JsonNode node = mapper.readTree(p);
        Map<String, Facet> facets = new HashMap<>();

        Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            String key = entry.getKey();
            JsonNode value = entry.getValue();

            Facet facet;
            Class<? extends Facet> typedClass = TYPED_FACETS.get(key);

            try {
                if (typedClass != null) {
                    facet = mapper.treeToValue(value, typedClass);
                } else {
                    facet = mapper.treeToValue(value, GenericFacet.class);
                }
            } catch (JsonProcessingException | IllegalArgumentException e) {
                // If typed deserialization fails, fallback to generic — never lose data
                try {
                    facet = mapper.treeToValue(value, GenericFacet.class);
                } catch (JsonProcessingException ex) {
                    throw ex;
                }
            }
            facets.put(key, facet);
        }
        return facets;
    }
}
