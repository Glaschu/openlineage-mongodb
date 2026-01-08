package com.openlineage.server.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlineage.server.storage.TagDocument;
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

import java.util.Collections;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@EnableAutoConfiguration(exclude = { MongoAutoConfiguration.class, MongoDataAutoConfiguration.class,
        org.springframework.boot.autoconfigure.data.mongo.MongoRepositoriesAutoConfiguration.class })
public class TagIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper mapper;

    @MockBean
    private TagRepository tagRepo;

    // Mock other repos to satisfy LineageService dependency if needed
    @MockBean
    private com.openlineage.server.storage.LineageEventRepository eventRepo;
    @MockBean
    private com.openlineage.server.storage.JobRepository jobRepo;
    @MockBean
    private com.openlineage.server.storage.DatasetRepository datasetRepo;
    @MockBean
    private com.openlineage.server.storage.DataSourceRepository dataSourceRepo;
    @MockBean
    private org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;
    @MockBean
    private com.openlineage.server.storage.RunRepository runRepo;
    @MockBean
    private com.openlineage.server.storage.InputDatasetFacetRepository inputRepo;
    @MockBean
    private com.openlineage.server.storage.OutputDatasetFacetRepository outputRepo;
    @MockBean
    private com.openlineage.server.storage.NamespaceRepository nsRepo;

    @BeforeEach
    public void setup() {
        when(tagRepo.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    public void testCreateTag() throws Exception {
        String tagName = "tag";
        String description = "Description";
        TagDocument doc = new TagDocument(tagName, description, java.time.ZonedDateTime.now());

        when(tagRepo.save(any())).thenReturn(doc);

        // Use PUT to create/update
        mockMvc.perform(put("/api/v1/tags/" + tagName)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(doc)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(tagName))
                .andExpect(jsonPath("$.description").value(description));
    }

    @Test
    public void testCreateTagNoDescription() throws Exception {
        String tagName = "tag2";
        TagDocument doc = new TagDocument(tagName, null, java.time.ZonedDateTime.now());

        when(tagRepo.save(any())).thenReturn(doc);

        mockMvc.perform(put("/api/v1/tags/" + tagName)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(doc)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(tagName))
                .andExpect(jsonPath("$.description").doesNotExist());
    }

    @Test
    public void testUpsertTag() throws Exception {
        String tagName = "tag";
        TagDocument initial = new TagDocument(tagName, "Description", java.time.ZonedDateTime.now());
        TagDocument updated = new TagDocument(tagName, "New Description", java.time.ZonedDateTime.now());

        when(tagRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        // Create
        mockMvc.perform(put("/api/v1/tags/" + tagName)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(initial)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("Description"));

        // Update
        mockMvc.perform(put("/api/v1/tags/" + tagName)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(updated)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("New Description"));
    }
}
