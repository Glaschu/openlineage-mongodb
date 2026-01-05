package com.openlineage.server.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlineage.server.storage.JobDocument;
import com.openlineage.server.storage.JobRepository;
import com.openlineage.server.storage.TagRepository;
import org.junit.jupiter.api.BeforeEach;
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
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@EnableAutoConfiguration(exclude = {MongoAutoConfiguration.class, MongoDataAutoConfiguration.class, org.springframework.boot.autoconfigure.data.mongo.MongoRepositoriesAutoConfiguration.class})
public class JobIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper mapper;

    @MockBean
    private JobRepository jobRepo;

    @MockBean
    private com.openlineage.server.storage.NamespaceRepository nsRepo;

    @MockBean
    private com.openlineage.server.storage.DatasetRepository datasetRepo;

    @MockBean
    private com.openlineage.server.storage.LineageEventRepository eventRepo;

    @MockBean
    private TagRepository tagRepo;

    private final String NAMESPACE = "default";
    private final String JOB_NAME = "my-job";

    @BeforeEach
    public void setup() {
        when(jobRepo.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    public void testCreateJob() throws Exception {
        when(jobRepo.findById(any())).thenReturn(Optional.empty()); // simulate create
        
        mockMvc.perform(put("/api/v1/namespaces/" + NAMESPACE + "/jobs/" + JOB_NAME)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"description\": \"Job Description\", \"location\": \"https://github.com/repo\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(JOB_NAME))
                .andExpect(jsonPath("$.description").value("Job Description"))
                .andExpect(jsonPath("$.location").value("https://github.com/repo"));
    }

    @Test
    public void testGetJob() throws Exception {
        JobDocument doc = new JobDocument(NAMESPACE, JOB_NAME, Collections.emptyMap(), Collections.emptySet(), Collections.emptySet(), ZonedDateTime.now());
        doc.setDescription("Existing Description");
        doc.setLocation("location");

        when(jobRepo.findById(any())).thenReturn(Optional.of(doc));

        mockMvc.perform(get("/api/v1/namespaces/" + NAMESPACE + "/jobs/" + JOB_NAME))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(JOB_NAME))
                .andExpect(jsonPath("$.description").value("Existing Description"))
                .andExpect(jsonPath("$.location").value("location"));
    }

    @Test
    public void testDeleteJob() throws Exception {
        when(jobRepo.existsById(any())).thenReturn(true);
        
        mockMvc.perform(delete("/api/v1/namespaces/" + NAMESPACE + "/jobs/" + JOB_NAME))
                .andExpect(status().isNoContent());

        verify(jobRepo).deleteById(any());
    }
}
