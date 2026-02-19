package com.openlineage.server.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlineage.server.domain.Job;
import com.openlineage.server.domain.RunEvent;

import com.openlineage.server.storage.repository.DatasetRepository;
import com.openlineage.server.storage.repository.JobRepository;
import com.openlineage.server.storage.repository.LineageEventRepository;
import com.openlineage.server.storage.repository.NamespaceRepository;
import com.openlineage.server.storage.repository.RunRepository;
import com.openlineage.server.storage.repository.DataSourceRepository;
import com.openlineage.server.storage.repository.TagRepository;
import com.openlineage.server.storage.repository.InputDatasetFacetRepository;
import com.openlineage.server.storage.repository.OutputDatasetFacetRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration;
import org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@EnableAutoConfiguration(exclude = { MongoAutoConfiguration.class, MongoDataAutoConfiguration.class,
                org.springframework.boot.autoconfigure.data.mongo.MongoRepositoriesAutoConfiguration.class })
public class RunEventIntegrationTest {

        @Autowired
        private MockMvc mockMvc;

        @Autowired
        private ObjectMapper mapper;

        @MockBean
        private org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

        // Repositories dependencies for LineageService
        @MockBean
        private LineageEventRepository eventRepo;

        @MockBean
        private NamespaceRepository nsRepo;

        @MockBean
        private JobRepository jobRepo;

        @MockBean
        private DatasetRepository datasetRepo;

        @MockBean
        private RunRepository runRepo;

        @MockBean
        private DataSourceRepository dataSourceRepo;

        @MockBean
        private TagRepository tagRepo;

        @MockBean
        private InputDatasetFacetRepository inputRepo;

        @MockBean
        private OutputDatasetFacetRepository outputRepo;

    @MockBean
    private com.openlineage.server.storage.repository.LineageEdgeRepository lineageEdgeRepo;

        @Test
        public void testPostEvent() throws Exception {
                RunEvent event = new RunEvent(
                                "START",
                                ZonedDateTime.now(),
                                new RunEvent.Run(UUID.randomUUID().toString(), Collections.emptyMap()),
                                new Job("default", "my-job", Collections.emptyMap()),
                                Collections.emptyList(),
                                Collections.emptyList(),
                                "producer",
                                "http://schema.url");

                mockMvc.perform(post("/api/v2/lineage")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(mapper.writeValueAsString(event)))
                                .andExpect(status().isCreated());

                // Verify that the event was processed by the service (which saves to eventRepo)
                verify(eventRepo).save(any());
                // Verify atomic upsert via mongoTemplate
                verify(mongoTemplate, org.mockito.Mockito.atLeastOnce()).upsert(
                                any(org.springframework.data.mongodb.core.query.Query.class),
                                any(org.springframework.data.mongodb.core.query.Update.class), (Class<?>) any());
        }
}
