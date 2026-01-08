package com.openlineage.server.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlineage.server.api.models.SearchFilter;
import com.openlineage.server.api.models.SearchSort;
import com.openlineage.server.storage.DatasetDocument;
import com.openlineage.server.storage.JobDocument;
import com.openlineage.server.storage.MarquezId;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration;
import org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.test.web.servlet.MockMvc;

import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@EnableAutoConfiguration(exclude = { MongoAutoConfiguration.class, MongoDataAutoConfiguration.class,
        org.springframework.boot.autoconfigure.data.mongo.MongoRepositoriesAutoConfiguration.class })
public class SearchIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MongoTemplate mongoTemplate;

    // Repositories to mock for context loading
    @MockBean
    private com.openlineage.server.storage.JobRepository jobRepo;
    @MockBean
    private com.openlineage.server.storage.DatasetRepository datasetRepo;
    @MockBean
    private com.openlineage.server.storage.NamespaceRepository nsRepo;
    @MockBean
    private com.openlineage.server.storage.LineageEventRepository eventRepo;
    @MockBean
    private com.openlineage.server.storage.RunRepository runRepo;
    @MockBean
    private com.openlineage.server.storage.TagRepository tagRepo;
    @MockBean
    private com.openlineage.server.storage.DataSourceRepository dataSourceRepo;
    @MockBean
    private com.openlineage.server.storage.InputDatasetFacetRepository inputRepo;
    @MockBean
    private com.openlineage.server.storage.OutputDatasetFacetRepository outputRepo;
    @MockBean
    private com.openlineage.server.service.LineageService lineageService;

    @Test
    public void testSearchBothInternal() throws Exception {
        // Setup Mocks
        JobDocument job = new JobDocument();
        job.setId(new MarquezId("ns", "my-job"));
        job.setUpdatedAt(ZonedDateTime.now());

        DatasetDocument dataset = new DatasetDocument("ns", "my-dataset", "src", Collections.emptyList(),
                ZonedDateTime.now());

        when(mongoTemplate.find(any(Query.class), eq(JobDocument.class))).thenReturn(List.of(job));
        when(mongoTemplate.find(any(Query.class), eq(DatasetDocument.class))).thenReturn(List.of(dataset));

        mockMvc.perform(get("/api/v1/search?q=my"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(2))
                .andExpect(jsonPath("$.results[0].name").value("my-dataset")) // Sorted by NAME by default
                .andExpect(jsonPath("$.results[1].name").value("my-job"));
    }

    @Test
    public void testSearchFilterJob() throws Exception {
        JobDocument job = new JobDocument();
        job.setId(new MarquezId("ns", "my-job"));

        when(mongoTemplate.find(any(Query.class), eq(JobDocument.class))).thenReturn(List.of(job));

        mockMvc.perform(get("/api/v1/search?q=my&filter=JOB"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(1))
                .andExpect(jsonPath("$.results[0].type").value("JOB"))
                .andExpect(jsonPath("$.results[0].name").value("my-job"));
    }
}
