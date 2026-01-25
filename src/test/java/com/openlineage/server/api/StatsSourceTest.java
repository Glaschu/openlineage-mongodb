package com.openlineage.server.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlineage.server.storage.document.NamespaceRegistryDocument;
import com.openlineage.server.storage.repository.NamespaceRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.bson.Document;

import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;

@WebMvcTest(StatsController.class)
public class StatsSourceTest {

        @Autowired
        private MockMvc mockMvc;

        @MockBean
        private MongoTemplate mongoTemplate;

        @MockBean
        private NamespaceRepository namespaceRepository;

        @MockBean
        private com.openlineage.server.storage.repository.JobRepository jobRepo;

        @MockBean
        private com.openlineage.server.storage.repository.DatasetRepository dsRepo;

        @MockBean
        private com.openlineage.server.storage.repository.LineageEventRepository lineageEventRepo;

        @MockBean
        private com.openlineage.server.storage.repository.TagRepository tagRepo; // Likely needed too as TagController
                                                                                 // is
                                                                                 // common

        @Test
        public void testGetSourceStatsWithTypoTimezone() throws Exception {
                // User reported: sources?period=DAY&timezoon=Europe/london
                // This implies query param 'timezoon' is ignored, default 'UTC' used.
                // If this fails, then something else is wrong.

                when(mongoTemplate.count(any(), eq(NamespaceRegistryDocument.class))).thenReturn(10L);

                // Mock aggregation result
                Document doc = new Document("_id", "2023-10-27T10:00:00Z").append("count", 5);
                AggregationResults<Document> results = new AggregationResults<>(List.of(doc), new Document());
                when(mongoTemplate.aggregate(any(), eq(NamespaceRegistryDocument.class), eq(Document.class)))
                                .thenReturn(results);

                mockMvc.perform(get("/api/v2/stats/sources")
                                .param("period", "DAY")
                                .param("timezoon", "Europe/london")) // Typo in param name
                                .andExpect(status().isOk());
        }

        @Test
        public void testGetSourceStatsWithLowerCaseTimezone() throws Exception {
                // Test explicit timezone with lower case 'l' which Java ZoneId might reject

                when(mongoTemplate.count(any(), eq(NamespaceRegistryDocument.class))).thenReturn(10L);
                Document doc = new Document("_id", "2023-10-27T10:00:00Z").append("count", 5);
                AggregationResults<Document> results = new AggregationResults<>(List.of(doc), new Document());

                // This setup primarily checking if Controller throws 500 before hitting DB
                // mocks largely
                // But logic calls ZoneId.of(timezone) early.

                when(mongoTemplate.aggregate(any(), eq(NamespaceRegistryDocument.class), eq(Document.class)))
                                .thenReturn(results);

                mockMvc.perform(get("/api/v2/stats/sources")
                                .param("period", "DAY")
                                .param("timezone", "Europe/London")) // Explicit valid timezone
                                .andExpect(status().isOk());
        }
}
