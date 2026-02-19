package com.openlineage.server.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.openlineage.server.storage.document.JobDocument;
import com.openlineage.server.storage.document.MarquezId;
import com.openlineage.server.storage.document.RunDocument;
import com.openlineage.server.storage.repository.JobRepository;
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
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@EnableAutoConfiguration(exclude = { MongoAutoConfiguration.class, MongoDataAutoConfiguration.class,
                org.springframework.boot.autoconfigure.data.mongo.MongoRepositoriesAutoConfiguration.class })
public class JobRunsGraphTest {

        @Autowired
        private MockMvc mockMvc;

        @MockBean
        private JobRepository jobRepo;

        @MockBean
        private RunRepository runRepo;

        // Additional Mocks needed for context
        @MockBean
        private org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;
        @MockBean
        private com.openlineage.server.storage.repository.DataSourceRepository dataSourceRepo;
        @MockBean
        private com.openlineage.server.storage.repository.NamespaceRepository nsRepo;
        @MockBean
        private com.openlineage.server.storage.repository.DatasetRepository datasetRepo;
        @MockBean
        private com.openlineage.server.storage.repository.LineageEventRepository eventRepo;
        @MockBean
        private com.openlineage.server.storage.repository.TagRepository tagRepo;
        @MockBean
        private com.openlineage.server.storage.repository.InputDatasetFacetRepository inputRepo;
        @MockBean
        private com.openlineage.server.storage.repository.OutputDatasetFacetRepository outputRepo;

    @MockBean
    private com.openlineage.server.storage.repository.LineageEdgeRepository lineageEdgeRepo;

        @Test
        public void testGetJobReturnsLatestRuns() throws Exception {
                String namespace = "ns";
                String jobName = "job1";
                MarquezId jobId = new MarquezId(namespace, jobName);

                JobDocument job = new JobDocument(namespace, jobName, Collections.emptyMap(), Collections.emptySet(),
                                Collections.emptySet(), ZonedDateTime.now());

                when(jobRepo.findById(jobId)).thenReturn(Optional.of(job));

                // Create 15 runs
                List<RunDocument> runs = IntStream.range(0, 15)
                                .mapToObj(i -> {
                                        RunDocument run = new RunDocument();
                                        run.setRunId(UUID.randomUUID().toString());
                                        run.setJob(new MarquezId(namespace, jobName));
                                        run.setEventTime(ZonedDateTime.now().minusMinutes(i));
                                        return run;
                                })
                                .collect(Collectors.toList());

                // Mock paginated repo returning first 10 runs
                when(runRepo.findByJobNamespaceAndJobName(any(), any(), any()))
                                .thenReturn(new org.springframework.data.domain.PageImpl<>(runs.subList(0, 10)));

                mockMvc.perform(get("/api/v2/namespaces/" + namespace + "/jobs/" + jobName))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.latestRun").exists())
                                .andExpect(jsonPath("$.latestRuns").isArray())
                                .andExpect(jsonPath("$.latestRuns.length()").value(10)) // Should limit to 10
                                .andExpect(jsonPath("$.latestRun.id").value(runs.get(0).getRunId().toString()))
                                .andExpect(jsonPath("$.state").value("RUNNING"))
                                .andExpect(jsonPath("$.durationMs").doesNotExist()); // Duration is null for running
                                                                                     // without start/end
        }

        @Test
        public void testGetJobReturnsEmptyRunsIfNone() throws Exception {
                String namespace = "ns";
                String jobName = "job2";
                MarquezId jobId = new MarquezId(namespace, jobName);

                JobDocument job = new JobDocument(namespace, jobName, Collections.emptyMap(), Collections.emptySet(),
                                Collections.emptySet(), ZonedDateTime.now());

                when(jobRepo.findById(jobId)).thenReturn(Optional.of(job));
                when(runRepo.findByJobNamespaceAndJobName(any(), any(), any()))
                                .thenReturn(new org.springframework.data.domain.PageImpl<>(Collections.emptyList()));

                mockMvc.perform(get("/api/v2/namespaces/" + namespace + "/jobs/" + jobName))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.latestRun").doesNotExist()) // Or null?
                                .andExpect(jsonPath("$.latestRuns").isArray())
                                .andExpect(jsonPath("$.latestRuns").isEmpty());
        }
}
