package com.openlineage.server.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlineage.server.domain.ColumnLineageDatasetFacet;
import com.openlineage.server.domain.ColumnLineageDatasetFacet.Fields;
import com.openlineage.server.domain.ColumnLineageDatasetFacet.InputField;
import com.openlineage.server.storage.document.*;
import com.openlineage.server.storage.repository.DatasetRepository;
import com.openlineage.server.storage.repository.InputDatasetFacetRepository;
import com.openlineage.server.storage.repository.JobRepository;
import com.openlineage.server.storage.repository.OutputDatasetFacetRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration;
import org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.ZonedDateTime;
import java.util.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@EnableAutoConfiguration(exclude = { MongoAutoConfiguration.class, MongoDataAutoConfiguration.class,
        org.springframework.boot.autoconfigure.data.mongo.MongoRepositoriesAutoConfiguration.class })
public class ColumnLineageGraphTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    @MockBean
    private JobRepository jobRepo;

    @MockBean
    private DatasetRepository datasetRepo;

    @MockBean
    private InputDatasetFacetRepository inputRepo;

    @MockBean
    private OutputDatasetFacetRepository outputRepo;

    @MockBean
    private com.openlineage.server.storage.repository.LineageEdgeRepository lineageEdgeRepo;

    @MockBean
    private com.openlineage.server.storage.repository.LineageEventRepository eventRepo;

    @MockBean
    private com.openlineage.server.storage.repository.TagRepository tagRepo;

    @MockBean
    private com.openlineage.server.storage.repository.RunRepository runRepo;

    @MockBean
    private com.openlineage.server.storage.repository.DataSourceRepository dataSourceRepo;

    @MockBean
    private com.openlineage.server.storage.repository.NamespaceRepository nsRepo;

    @Test
    public void testGetColumnLineageWithFacets() throws Exception {
        String inNs = "inNs";
        String inName = "inDs";
        String outNs = "outNs";
        String outName = "outDs";

        MarquezId inputId = new MarquezId(inNs, inName);
        MarquezId outputId = new MarquezId(outNs, outName);

        // 1. Setup Datasets
        DatasetDocument inDs = new DatasetDocument();
        inDs.setId(inputId);
        inDs.setUpdatedAt(ZonedDateTime.now());

        DatasetDocument outDs = new DatasetDocument();
        outDs.setId(outputId);
        outDs.setUpdatedAt(ZonedDateTime.now());

        when(datasetRepo.findAllById(any())).thenAnswer(invocation -> {
            Iterable<MarquezId> ids = invocation.getArgument(0);
            List<DatasetDocument> docs = new ArrayList<>();
            for (MarquezId id : ids) {
                if (id.equals(inputId))
                    docs.add(inDs);
                if (id.equals(outputId))
                    docs.add(outDs);
            }
            return docs;
        });

        // 2. Setup Facets (Column Lineage on Output, Schema on both)
        // Schema Facet
        com.openlineage.server.domain.SchemaDatasetFacet.SchemaField col1 = new com.openlineage.server.domain.SchemaDatasetFacet.SchemaField(
                "inputCol", "VARCHAR", "desc");
        com.openlineage.server.domain.SchemaDatasetFacet inputSchema = new com.openlineage.server.domain.SchemaDatasetFacet(
                List.of(col1));

        com.openlineage.server.domain.SchemaDatasetFacet.SchemaField col2 = new com.openlineage.server.domain.SchemaDatasetFacet.SchemaField(
                "outputCol", "VARCHAR", "desc");
        com.openlineage.server.domain.SchemaDatasetFacet outputSchema = new com.openlineage.server.domain.SchemaDatasetFacet(
                List.of(col2));

        // inputCol -> outputCol
        InputField inputField = new InputField(inNs, inName, "inputCol");
        Fields fields = new Fields(List.of(inputField), "desc", "type");
        ColumnLineageDatasetFacet colLineage = new ColumnLineageDatasetFacet(Map.of("outputCol", fields));

        OutputDatasetFacetDocument outFacetDoc = new OutputDatasetFacetDocument(outputId,
                Map.of("columnLineage", colLineage, "schema", outputSchema), ZonedDateTime.now());

        InputDatasetFacetDocument inFacetDoc = new InputDatasetFacetDocument(inputId,
                Map.of("schema", inputSchema), ZonedDateTime.now());

        when(outputRepo.findAllById(any())).thenAnswer(invocation -> {
            Iterable<MarquezId> ids = invocation.getArgument(0);
            List<OutputDatasetFacetDocument> docs = new ArrayList<>();
            for (MarquezId id : ids) {
                if (id.equals(outputId))
                    docs.add(outFacetDoc);
            }
            return docs;
        });

        when(inputRepo.findAllById(any())).thenAnswer(invocation -> {
            Iterable<MarquezId> ids = invocation.getArgument(0);
            List<InputDatasetFacetDocument> docs = new ArrayList<>();
            for (MarquezId id : ids) {
                if (id.equals(inputId))
                    docs.add(inFacetDoc);
            }
            return docs;
        });

        // 3. Perform Request — start from the output dataset
        String nodeId = "dataset:" + outNs + ":" + outName;

        String response = mockMvc.perform(get("/api/v2/column-lineage")
                .param("nodeId", nodeId)
                .param("depth", "5"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        System.out.println("Response: " + response);

        // 4. Verify input column node was discovered via column lineage BFS
        if (!response.contains("\"id\":\"datasetField:" + inNs + ":" + inName + ":inputCol\"")) {
            throw new RuntimeException("Missing input column node");
        }

        // Check for edge (origin -> destination)
        String expectedEdge = "\"origin\":\"datasetField:" + inNs + ":" + inName
                + ":inputCol\",\"destination\":\"datasetField:" + outNs + ":" + outName
                + ":outputCol\"";
        if (!response.contains(expectedEdge) && !response.contains(expectedEdge.replace(",", ", "))) {
            throw new RuntimeException("Missing column lineage edge. Response: " + response);
        }

        // Verify input node has outEdges and output node has inEdges
        if (!response.contains("\"id\":\"datasetField:" + inNs + ":" + inName + ":inputCol\"")
                || !response.contains("\"outEdges\":[{\"origin\"")) {
            throw new RuntimeException("Input node missing outEdges");
        }
        if (!response.contains("\"id\":\"datasetField:" + outNs + ":" + outName + ":outputCol\"")
                || !response.contains("\"inEdges\":[{\"origin\"")) {
            throw new RuntimeException("Output node missing inEdges");
        }
    }
}
