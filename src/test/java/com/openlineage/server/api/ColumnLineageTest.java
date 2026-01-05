package com.openlineage.server.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.openlineage.server.domain.ColumnLineageDatasetFacet;
import com.openlineage.server.domain.ColumnLineageDatasetFacet.Fields;
import com.openlineage.server.domain.ColumnLineageDatasetFacet.InputField;
import com.openlineage.server.api.models.LineageResponse.DatasetData;
import com.openlineage.server.domain.Facet;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;

public class ColumnLineageTest {

    @Test
    public void testSerialization() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());

        InputField inputField = new InputField("ns", "name", "col");
        Fields fields = new Fields(List.of(inputField), "desc", "type");
        ColumnLineageDatasetFacet facet = new ColumnLineageDatasetFacet(Map.of("col1", fields));
        
        Map<String, Facet> facets = Map.of("columnLineage", facet);

        DatasetData data = new DatasetData(
            "name", "type", "name", "phys", null, null, "ns", "source", 
            Collections.emptyList(), Collections.emptySet(), null, "desc", facets
        );

        String json = mapper.writeValueAsString(data);
        System.out.println("JSON: " + json);

        assertTrue(json.contains("columnLineage"), "JSON should contain columnLineage key");
        assertTrue(json.contains("inputFields"), "JSON should contain inputFields");
    }

    @Test
    public void testDatasetFieldDataSerialization() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        com.openlineage.server.api.models.LineageResponse.DatasetFieldData data = 
            new com.openlineage.server.api.models.LineageResponse.DatasetFieldData(
                "ns", "ds", "colName", "colName", "column", "VARCHAR"
            );
        
        String json = mapper.writeValueAsString(data);
        System.out.println("Field JSON: " + json);
        
        assertTrue(json.contains("\"column\":\"colName\""), "JSON should contain 'column' key");
    }
}
