package com.openlineage.server.domain;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.Map;

public class FacetSerializationTest {

    private final ObjectMapper mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @Test
    public void testSchemaFacetDeserialization() throws Exception {
        String json = """
            {
              "eventType": "START",
              "eventTime": "2021-11-03T10:00:00.000Z",
              "run": { "runId": "123" },
              "job": { "namespace": "ns", "name": "job" },
              "inputs": [
                {
                  "namespace": "db", 
                  "name": "table",
                  "facets": {
                    "schema": {
                      "fields": [
                        { "name": "col1", "type": "STRING" }
                      ]
                    },
                    "unknownFacet": {
                        "someProp": "someValue"
                    }
                  }
                }
              ]
            }
            """;

        RunEvent event = mapper.readValue(json, RunEvent.class);
        
        Assertions.assertNotNull(event.inputs());
        Assertions.assertEquals(1, event.inputs().size());
        
        Map<String, Facet> facets = event.inputs().get(0).facets();
        Assertions.assertTrue(facets.containsKey("schema"));
        Assertions.assertTrue(facets.containsKey("unknownFacet"));

        // Check Strong Type
        Facet schemaFacet = facets.get("schema");
        Assertions.assertInstanceOf(SchemaDatasetFacet.class, schemaFacet);
        SchemaDatasetFacet typedSchema = (SchemaDatasetFacet) schemaFacet;
        Assertions.assertEquals("col1", typedSchema.fields().get(0).name());

        // Check Generic Type
        Facet unknown = facets.get("unknownFacet");
        Assertions.assertInstanceOf(GenericFacet.class, unknown);
        // GenericFacet mapping depends on how deserializer handles it. Default GenericFacet might capture props via @JsonAnySetter?
        // Wait, my GenericFacet implementation has @JsonAnySetter. Does object mapper use it when using treeToValue(GenericFacet.class)?
        // Yes, standard Jackson behavior should work if treeToValue uses the standard deserializer for the POJO.
    }

    @Test
    public void testSymlinksFacetDeserialization() throws Exception {
        String json = """
            {
              "eventType": "START",
              "eventTime": "2021-11-03T10:00:00.000Z",
              "run": { "runId": "123" },
              "job": { "namespace": "ns", "name": "job" },
              "inputs": [
                {
                  "namespace": "s3://my-bucket", 
                  "name": "my-dir",
                  "facets": {
                    "symlinks": {
                      "_producer": "producer-url",
                      "_schemaURL": "schema-url",
                      "identifiers": [
                        { "namespace": "arn:aws:glue", "name": "db.table", "type": "TABLE" }
                      ]
                    }
                  }
                }
              ]
            }
            """;

        RunEvent event = mapper.readValue(json, RunEvent.class);
        Map<String, Facet> facets = event.inputs().get(0).facets();
        Assertions.assertTrue(facets.containsKey("symlinks"));

        Facet symlinksFacet = facets.get("symlinks");
        Assertions.assertInstanceOf(SymlinksDatasetFacet.class, symlinksFacet);
        SymlinksDatasetFacet typedSymlinks = (SymlinksDatasetFacet) symlinksFacet;
        
        Assertions.assertEquals("producer-url", typedSymlinks._producer());
        Assertions.assertEquals(1, typedSymlinks.identifiers().size());
        Assertions.assertEquals("arn:aws:glue", typedSymlinks.identifiers().get(0).namespace());
        Assertions.assertEquals("db.table", typedSymlinks.identifiers().get(0).name());
        Assertions.assertEquals("TABLE", typedSymlinks.identifiers().get(0).type());
    }
}
