package com.openlineage.server.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlineage.server.storage.DatasetDocument;
import com.openlineage.server.storage.DatasetRepository;
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
@EnableAutoConfiguration(exclude = { MongoAutoConfiguration.class, MongoDataAutoConfiguration.class,
                org.springframework.boot.autoconfigure.data.mongo.MongoRepositoriesAutoConfiguration.class })
public class DatasetIntegrationTest {

        @Autowired
        private MockMvc mockMvc;

        @Autowired
        private ObjectMapper mapper;

        @MockBean
        private DatasetRepository datasetRepo;

        @MockBean
        private com.openlineage.server.storage.NamespaceRepository nsRepo;

        @MockBean
        private com.openlineage.server.storage.JobRepository jobRepo;

        @MockBean
        private com.openlineage.server.storage.LineageEventRepository eventRepo;

        @MockBean
        private TagRepository tagRepo;

        // Inject mocks for new repositories to avoid initialization errors
        @MockBean
        private com.openlineage.server.storage.InputDatasetFacetRepository inputRepo;

        @MockBean
        private com.openlineage.server.storage.OutputDatasetFacetRepository outputRepo;

        private final String NAMESPACE = "default";
        private final String DATASET_NAME = "my-dataset";

        @BeforeEach
        public void setup() {
                when(datasetRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        }

        @Test
        public void testCreateDataset() throws Exception {
                DatasetDocument doc = new DatasetDocument(NAMESPACE, DATASET_NAME, "source", Collections.emptyList(),
                                ZonedDateTime.now());
                doc.setDescription("Description");

                when(datasetRepo.findById(any())).thenReturn(Optional.empty()); // simulate create

                mockMvc.perform(put("/api/v1/namespaces/" + NAMESPACE + "/datasets/" + DATASET_NAME)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"physicalName\": \"p\", \"sourceName\": \"s\", \"description\": \"Description\"}"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.name").value(DATASET_NAME))
                                .andExpect(jsonPath("$.description").value("Description"));
        }

        @Test
        public void testGetDataset() throws Exception {
                DatasetDocument doc = new DatasetDocument(NAMESPACE, DATASET_NAME, "source", Collections.emptyList(),
                                ZonedDateTime.now());
                doc.setDescription("Existing Description");

                when(datasetRepo.findById(any())).thenReturn(Optional.of(doc));

                mockMvc.perform(get("/api/v1/namespaces/" + NAMESPACE + "/datasets/" + DATASET_NAME))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.name").value(DATASET_NAME))
                                .andExpect(jsonPath("$.description").value("Existing Description"));
        }

        @Test
        public void testDeleteDataset() throws Exception {
                when(datasetRepo.existsById(any())).thenReturn(true);

                mockMvc.perform(delete("/api/v1/namespaces/" + NAMESPACE + "/datasets/" + DATASET_NAME))
                                .andExpect(status().isNoContent());

                verify(datasetRepo).deleteById(any());
        }

        @Test
        public void testTagDataset() throws Exception {
                DatasetDocument doc = new DatasetDocument(NAMESPACE, DATASET_NAME, "source", Collections.emptyList(),
                                ZonedDateTime.now());

                when(datasetRepo.findById(any())).thenReturn(Optional.of(doc));

                mockMvc.perform(post("/api/v1/namespaces/" + NAMESPACE + "/datasets/" + DATASET_NAME + "/tags/PII"))
                                .andExpect(status().isCreated());

                verify(datasetRepo).save(any());
                verify(tagRepo).save(any());
        }
}
