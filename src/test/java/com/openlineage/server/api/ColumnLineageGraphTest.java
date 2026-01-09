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
        private com.openlineage.server.storage.repository.LineageEventRepository eventRepo;

        @MockBean
        private com.openlineage.server.storage.repository.TagRepository tagRepo;

        @MockBean
        private com.openlineage.server.storage.repository.RunRepository runRepo;

        @MockBean
        private com.openlineage.server.storage.repository.DataSourceRepository dataSourceRepo; // Add this mock

        @MockBean
        private com.openlineage.server.storage.repository.NamespaceRepository nsRepo; // Add this mock

        @Test
        public void testGetColumnLineageWithFacets() throws Exception {
                String jobNs = "jobNs";
                String jobName = "job1";
                String inNs = "inNs";
                String inName = "inDs";
                String outNs = "outNs";
                String outName = "outDs";

                // 1. Setup Job (Job consumed input and produced output)
                MarquezId jobId = new MarquezId(jobNs, jobName);
                MarquezId inputId = new MarquezId(inNs, inName);
                MarquezId outputId = new MarquezId(outNs, outName);

                JobDocument jobDoc = new JobDocument(jobNs, jobName, Collections.emptyMap(),
                                Set.of(inputId), Set.of(outputId), ZonedDateTime.now());

                // Mock Job Fetch
                when(jobRepo.findById(jobId)).thenReturn(Optional.of(jobDoc));
                // Job produces outputId
                when(jobRepo.findByOutputsContaining(outputId)).thenReturn(List.of(jobDoc));
                // Job consumes inputId
                when(jobRepo.findByInputsContaining(inputId)).thenReturn(List.of(jobDoc));

                // Default empty for others
                when(jobRepo.findByInputsContaining(outputId)).thenReturn(Collections.emptyList());
                when(jobRepo.findByOutputsContaining(inputId)).thenReturn(Collections.emptyList());

                // 2. Setup Datasets
                DatasetDocument inDs = new DatasetDocument();
                inDs.setId(inputId);
                inDs.setUpdatedAt(ZonedDateTime.now());

                DatasetDocument outDs = new DatasetDocument();
                outDs.setId(outputId);
                outDs.setUpdatedAt(ZonedDateTime.now());

                when(datasetRepo.findById(inputId)).thenReturn(Optional.of(inDs));
                when(datasetRepo.findById(outputId)).thenReturn(Optional.of(outDs));

                // 3. Setup Facets (Column Lineage on Output, Schema on both)
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

                when(outputRepo.findById(outputId)).thenReturn(Optional.of(outFacetDoc));
                when(inputRepo.findById(inputId)).thenReturn(Optional.of(inFacetDoc));
                when(inputRepo.findById(outputId)).thenReturn(Optional.empty()); // No input facets for output ds
                when(outputRepo.findById(inputId)).thenReturn(Optional.empty()); // No output facets for input ds

                // 4. Perform Request
                // Request lineage for the output dataset
                String nodeId = "dataset:" + outNs + ":" + outName;

                String response = mockMvc.perform(get("/api/v1/column-lineage")
                                .param("nodeId", nodeId)
                                .param("depth", "5"))
                                .andExpect(status().isOk())
                                .andReturn().getResponse().getContentAsString();

                System.out.println("Response: " + response);

                // Verification logic can be added here or just visual inspection of the failure
                if (!response.contains("\"id\":\"datasetField:" + inNs + ":" + inName + ":inputCol\"")) {
                        throw new RuntimeException("Missing input column node");
                }

                // Check for edge (Exact string match dependent on serialization)
                // Edge: origin -> destination
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
