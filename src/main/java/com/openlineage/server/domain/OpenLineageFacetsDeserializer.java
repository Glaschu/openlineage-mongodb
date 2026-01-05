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

public class OpenLineageFacetsDeserializer extends JsonDeserializer<Map<String, Facet>> {

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
            try {
                if ("schema".equals(key)) {
                    facet = mapper.treeToValue(value, SchemaDatasetFacet.class);
                } else if ("ownership".equals(key)) {
                    facet = mapper.treeToValue(value, OwnershipDatasetFacet.class);
                } else if ("columnLineage".equals(key)) {
                    facet = mapper.treeToValue(value, ColumnLineageDatasetFacet.class);
                } else {
                    facet = mapper.treeToValue(value, GenericFacet.class);
                }
            } catch (JsonProcessingException | IllegalArgumentException e) {
                // If typed deserialization fails, fallback to generic
                try {
                    facet = mapper.treeToValue(value, GenericFacet.class);
                } catch (JsonProcessingException ex) {
                    // If even generic fails, skip or throw. Throwing is safer than silent data loss? 
                    // But GenericFacet is just a map, unlikely to fail unless JSON is invalid.
                    throw ex;
                }
            }
            facets.put(key, facet);
        }
        return facets;
    }
}
