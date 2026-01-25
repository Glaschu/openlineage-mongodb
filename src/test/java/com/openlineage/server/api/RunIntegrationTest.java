package com.openlineage.server.api;

import com.openlineage.server.domain.Dataset;
import com.openlineage.server.storage.document.MarquezId;
import com.openlineage.server.storage.document.RunDocument;
import com.openlineage.server.storage.repository.RunRepository;
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
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@EnableAutoConfiguration(exclude = { MongoAutoConfiguration.class, MongoDataAutoConfiguration.class,
                org.springframework.boot.autoconfigure.data.mongo.MongoRepositoriesAutoConfiguration.class })
public class RunIntegrationTest {

        @Autowired
        private MockMvc mockMvc;

        @MockBean
        private RunRepository runRepository;

        @MockBean
        private com.openlineage.server.service.LineageService lineageService;

        // Mock other repos to satisfy dependency injection if needed (though excluded
        // auto-config might enable strict component scan)
        @MockBean
        private com.openlineage.server.storage.repository.LineageEventRepository eventRepo;
        @MockBean
        private com.openlineage.server.storage.repository.NamespaceRepository nsRepo;
        @MockBean
        private com.openlineage.server.storage.repository.JobRepository jobRepo;
        @MockBean
        private com.openlineage.server.storage.repository.DatasetRepository datasetRepo;
        @MockBean
        private com.openlineage.server.storage.repository.DataSourceRepository dataSourceRepo;
        @MockBean
        private com.openlineage.server.service.FacetMergeService facetMergeService;
        @MockBean
        private com.openlineage.server.storage.repository.InputDatasetFacetRepository inputRepo;
        @MockBean
        private com.openlineage.server.storage.repository.OutputDatasetFacetRepository outputRepo;
        @MockBean
        private com.openlineage.server.storage.repository.TagRepository tagRepo;

        @MockBean
        private org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

        @Test
        public void testGetRun() throws Exception {
                String runId = "test-run-id";
                ZonedDateTime now = ZonedDateTime.now();
                Dataset input = new Dataset("ns", "input", Collections.emptyMap());
                Dataset output = new Dataset("ns", "output", Collections.emptyMap());

                RunDocument doc = new RunDocument(
                                runId,
                                new MarquezId("ns", "job"),
                                now,
                                "START",
                                List.of(input),
                                List.of(output),
                                Collections.emptyMap());
                doc.setStartTime(now);

                when(runRepository.findById(runId)).thenReturn(Optional.of(doc));

                mockMvc.perform(get("/api/v2/runs/" + runId))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id").value(runId))
                                .andExpect(jsonPath("$.state").value("RUNNING"))
                                .andExpect(jsonPath("$.inputs[0].name").value("input"))
                                .andExpect(jsonPath("$.outputs[0].name").value("output"));
        }

        @Test
        public void testListRuns() throws Exception {
                String runId = "test-run-id-2";
                ZonedDateTime now = ZonedDateTime.now();
                RunDocument doc = new RunDocument(
                                runId,
                                new MarquezId("ns", "job"),
                                now,
                                "COMPLETE",
                                Collections.emptyList(),
                                Collections.emptyList(),
                                Collections.emptyMap());

                when(runRepository.findByJobNamespaceAndJobNameOrderByEventTimeDesc("ns", "job"))
                                .thenReturn(List.of(doc));

                mockMvc.perform(get("/api/v2/namespaces/ns/jobs/job/runs"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.runs[0].id").value(runId))
                                .andExpect(jsonPath("$.runs[0].state").value("COMPLETED"));
        }
}
