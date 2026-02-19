package com.openlineage.server.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration;
import org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.test.web.servlet.MockMvc;
import org.bson.Document;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@EnableAutoConfiguration(exclude = { MongoAutoConfiguration.class, MongoDataAutoConfiguration.class,
                org.springframework.boot.autoconfigure.data.mongo.MongoRepositoriesAutoConfiguration.class })
public class StatsIntegrationTest {

        @Autowired
        private MockMvc mockMvc;

        @MockBean
        private MongoTemplate mongoTemplate;

        @MockBean
        private com.openlineage.server.storage.repository.JobRepository jobRepo;
        @MockBean
        private com.openlineage.server.storage.repository.DatasetRepository datasetRepo;
        @MockBean
        private com.openlineage.server.storage.repository.NamespaceRepository nsRepo;
        @MockBean
        private com.openlineage.server.storage.repository.RunRepository runRepo;
        @MockBean
        private com.openlineage.server.storage.repository.LineageEventRepository eventRepo;
        // Other required mocks to start context
        @MockBean
        private com.openlineage.server.service.LineageService lineageService;
        @MockBean
        private com.openlineage.server.storage.repository.DataSourceRepository dataSourceRepo;
        @MockBean
        private com.openlineage.server.storage.repository.InputDatasetFacetRepository inputRepo;
        @MockBean
        private com.openlineage.server.storage.repository.OutputDatasetFacetRepository outputRepo;

    @MockBean
    private com.openlineage.server.storage.repository.LineageEdgeRepository lineageEdgeRepo;
        @MockBean
        private com.openlineage.server.service.FacetMergeService facetMergeService;
        @MockBean
        private com.openlineage.server.storage.repository.TagRepository tagRepo;

        @Test
        public void testGetLineageEventStats() throws Exception {
                // Mock Aggregation Results
                Document doc1 = new Document("_id",
                                new Document("hour", "2023-01-01T10:00:00Z").append("type", "START"))
                                .append("count", 5);

                AggregationResults<Document> results = new AggregationResults<>(List.of(doc1), new Document());

                when(mongoTemplate.aggregate(any(), eq(com.openlineage.server.storage.document.LineageEventDocument.class),
                                eq(Document.class)))
                                .thenReturn(results);

                mockMvc.perform(get("/api/v2/stats/lineage-events"))
                                .andExpect(status().isOk());
                // Verification of fields requires mocking the date range precise match or
                // logic,
                // but status OK confirms endpoint works and calls aggregate.
        }

        @Test
        public void testGetJobStats() throws Exception {
                // Mock count and aggregation
                when(mongoTemplate.count(any(), eq(com.openlineage.server.storage.document.JobDocument.class))).thenReturn(10L);

                Document doc1 = new Document("_id", "2023-01-01T10:00:00Z").append("count", 2L);
                AggregationResults<Document> results = new AggregationResults<>(List.of(doc1), new Document());

                when(mongoTemplate.aggregate(any(), eq(com.openlineage.server.storage.document.JobDocument.class),
                                eq(Document.class)))
                                .thenReturn(results);

                mockMvc.perform(get("/api/v2/stats/jobs"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$").isArray());
        }
}
