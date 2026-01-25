package com.openlineage.server.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlineage.server.storage.document.DatasetDocument;
import com.openlineage.server.storage.repository.DatasetRepository;
import com.openlineage.server.storage.repository.TagRepository;
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
        private org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

        @MockBean
        private DatasetRepository datasetRepo;

        @MockBean
        private com.openlineage.server.storage.repository.DataSourceRepository dataSourceRepo;

        @MockBean
        private com.openlineage.server.storage.repository.NamespaceRepository nsRepo;

        @MockBean
        private com.openlineage.server.storage.repository.JobRepository jobRepo;

        @MockBean
        private com.openlineage.server.storage.repository.LineageEventRepository eventRepo;

        @MockBean
        private TagRepository tagRepo;

        @MockBean
        private com.openlineage.server.storage.repository.RunRepository runRepo;

        // Inject mocks for new repositories to avoid initialization errors
        @MockBean
        private com.openlineage.server.storage.repository.InputDatasetFacetRepository inputRepo;

        @MockBean
        private com.openlineage.server.storage.repository.OutputDatasetFacetRepository outputRepo;

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

                mockMvc.perform(put("/api/v2/namespaces/" + NAMESPACE + "/datasets/" + DATASET_NAME)
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

                mockMvc.perform(get("/api/v2/namespaces/" + NAMESPACE + "/datasets/" + DATASET_NAME))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.name").value(DATASET_NAME))
                                .andExpect(jsonPath("$.description").value("Existing Description"));
        }

        @Test
        public void testDeleteDataset() throws Exception {
                when(datasetRepo.existsById(any())).thenReturn(true);

                mockMvc.perform(delete("/api/v2/namespaces/" + NAMESPACE + "/datasets/" + DATASET_NAME))
                                .andExpect(status().isNoContent());

                verify(datasetRepo).deleteById(any());
        }

        @Test
        public void testTagDataset() throws Exception {
                DatasetDocument doc = new DatasetDocument(NAMESPACE, DATASET_NAME, "source", Collections.emptyList(),
                                ZonedDateTime.now());

                when(datasetRepo.findById(any())).thenReturn(Optional.of(doc));

                mockMvc.perform(post("/api/v2/namespaces/" + NAMESPACE + "/datasets/" + DATASET_NAME + "/tags/PII"))
                                .andExpect(status().isCreated());

                verify(datasetRepo).save(any());
                verify(tagRepo).save(any());
        }

        @Test
        public void testListDatasets() throws Exception {
                DatasetDocument doc1 = new DatasetDocument(NAMESPACE, "ds1", "src1", Collections.emptyList(),
                                ZonedDateTime.now());
                DatasetDocument doc2 = new DatasetDocument(NAMESPACE, "ds2", "src2", Collections.emptyList(),
                                ZonedDateTime.now());

                when(datasetRepo.findByIdNamespace(NAMESPACE)).thenReturn(java.util.List.of(doc1, doc2));

                mockMvc.perform(get("/api/v2/namespaces/" + NAMESPACE + "/datasets"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.datasets[0].name").value("ds1"))
                                .andExpect(jsonPath("$.datasets[1].name").value("ds2"))
                                .andExpect(jsonPath("$.totalCount").value(2));
        }

        @Test
        public void testListDatasetVersions() throws Exception {
                // Mock LineageEventDocument
                com.openlineage.server.storage.document.LineageEventDocument eventDoc = new com.openlineage.server.storage.document.LineageEventDocument();
                com.openlineage.server.domain.Job job = new com.openlineage.server.domain.Job(NAMESPACE, "job", null);
                com.openlineage.server.domain.RunEvent.Run run = new com.openlineage.server.domain.RunEvent.Run(
                                java.util.UUID.randomUUID().toString(), Collections.emptyMap());

                com.openlineage.server.domain.Dataset outputDs = new com.openlineage.server.domain.Dataset(NAMESPACE,
                                DATASET_NAME,
                                java.util.Collections.singletonMap("schema",
                                                new com.openlineage.server.domain.SchemaDatasetFacet(
                                                                Collections.emptyList())));

                com.openlineage.server.domain.RunEvent event = new com.openlineage.server.domain.RunEvent(
                                "COMPLETE", ZonedDateTime.now(), run, job, Collections.emptyList(),
                                java.util.List.of(outputDs), null, "schemaUrl");
                eventDoc.setEvent(event);

                org.springframework.data.domain.Page<com.openlineage.server.storage.document.LineageEventDocument> page = new org.springframework.data.domain.PageImpl<>(
                                java.util.List.of(eventDoc));

                when(eventRepo.findByEventOutputsNamespaceAndEventOutputsName(any(), any(), any())).thenReturn(page);

                mockMvc.perform(get("/api/v2/namespaces/" + NAMESPACE + "/datasets/" + DATASET_NAME + "/versions"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.versions[0].name").value(DATASET_NAME))
                                .andExpect(jsonPath("$.totalCount").value(1));
        }

        @Test
        public void testDeleteTag() throws Exception {
                DatasetDocument doc = new DatasetDocument(NAMESPACE, DATASET_NAME, "src", Collections.emptyList(),
                                ZonedDateTime.now());
                doc.getTags().add("tag1");

                when(datasetRepo.findById(any())).thenReturn(Optional.of(doc));

                mockMvc.perform(delete("/api/v2/namespaces/" + NAMESPACE + "/datasets/" + DATASET_NAME + "/tags/tag1"))
                                .andExpect(status().isNoContent());

                verify(datasetRepo).save(any());
        }

        @Test
        public void testGetDatasetNotFound() throws Exception {
                when(datasetRepo.findById(any())).thenReturn(Optional.empty());
                mockMvc.perform(get("/api/v2/namespaces/" + NAMESPACE + "/datasets/" + DATASET_NAME))
                                .andExpect(status().isNotFound());
        }

        @Test
        public void testDeleteDatasetNotFound() throws Exception {
                when(datasetRepo.existsById(any())).thenReturn(false);
                mockMvc.perform(delete("/api/v2/namespaces/" + NAMESPACE + "/datasets/" + DATASET_NAME))
                                .andExpect(status().isNotFound());
        }

        @Test
        public void testAddTagDatasetNotFound() throws Exception {
                when(datasetRepo.findById(any())).thenReturn(Optional.empty());
                mockMvc.perform(post("/api/v2/namespaces/" + NAMESPACE + "/datasets/" + DATASET_NAME + "/tags/tag"))
                                .andExpect(status().isNotFound());
        }

        @Test
        public void testDeleteTagDatasetNotFound() throws Exception {
                when(datasetRepo.findById(any())).thenReturn(Optional.empty());
                mockMvc.perform(delete("/api/v2/namespaces/" + NAMESPACE + "/datasets/" + DATASET_NAME + "/tags/tag"))
                                .andExpect(status().isNotFound());
        }
}
