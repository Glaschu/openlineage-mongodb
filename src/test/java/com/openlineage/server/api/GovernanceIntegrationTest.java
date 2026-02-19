package com.openlineage.server.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlineage.server.domain.Job;
import com.openlineage.server.domain.RunEvent;
import com.openlineage.server.storage.repository.JobRepository;
import com.openlineage.server.storage.document.NamespaceRegistryDocument;
import com.openlineage.server.storage.repository.NamespaceRepository;
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
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@EnableAutoConfiguration(exclude = { MongoAutoConfiguration.class, MongoDataAutoConfiguration.class,
        org.springframework.boot.autoconfigure.data.mongo.MongoRepositoriesAutoConfiguration.class })
public class GovernanceIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper mapper;

    @MockBean
    private org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    @MockBean
    private NamespaceRepository nsRepo;

    @MockBean
    private JobRepository jobRepo;

    @MockBean
    private com.openlineage.server.storage.repository.LineageEventRepository eventRepo;
    @MockBean
    private com.openlineage.server.storage.repository.DatasetRepository datasetRepo;
    @MockBean
    private com.openlineage.server.storage.repository.RunRepository runRepo;
    @MockBean
    private com.openlineage.server.storage.repository.DataSourceRepository dataSourceRepo;
    @MockBean
    private com.openlineage.server.storage.repository.TagRepository tagRepo;
    @MockBean
    private com.openlineage.server.storage.repository.InputDatasetFacetRepository inputRepo;
    @MockBean
    private com.openlineage.server.storage.repository.OutputDatasetFacetRepository outputRepo;

    @MockBean
    private com.openlineage.server.storage.repository.LineageEdgeRepository lineageEdgeRepo;

    @Test
    public void testClaimNewNamespace() throws Exception {
        String ns = "new-ns";
        String owner = "alice";

        when(nsRepo.findById(ns)).thenReturn(Optional.empty());

        RunEvent event = createEvent(ns);

        mockMvc.perform(post("/api/v2/lineage")
                .header("x-user", owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(event)))
                .andExpect(status().isCreated());

        // Verify save was called with owner
        verify(nsRepo).save(argThat(doc -> doc.getNamespace().equals(ns) && doc.getOwnerTeam().equals(owner)));
    }

    @Test
    public void testAccessAllowedForOwner() throws Exception {
        String ns = "owned-ns";
        String owner = "bob";

        NamespaceRegistryDocument doc = new NamespaceRegistryDocument(ns, owner, null, false, null);
        when(nsRepo.findById(ns)).thenReturn(Optional.of(doc));

        RunEvent event = createEvent(ns);

        mockMvc.perform(post("/api/v2/lineage")
                .header("x-user", owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(event)))
                .andExpect(status().isCreated());
    }

    @Test
    public void testAccessDeniedForDifferentOwner() throws Exception {
        String ns = "owned-ns";
        String owner = "bob";
        String intruder = "eve";

        NamespaceRegistryDocument doc = new NamespaceRegistryDocument(ns, owner, null, false, null);
        when(nsRepo.findById(ns)).thenReturn(Optional.of(doc));

        RunEvent event = createEvent(ns);

        mockMvc.perform(post("/api/v2/lineage")
                .header("x-user", intruder)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(event)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void testTakeoverUnclaimedNamespace() throws Exception {
        String ns = "legacy-ns";
        String newOwner = "charlie";

        NamespaceRegistryDocument doc = new NamespaceRegistryDocument(ns, "Unclaimed", null, false, null);
        when(nsRepo.findById(ns)).thenReturn(Optional.of(doc));

        RunEvent event = createEvent(ns);

        mockMvc.perform(post("/api/v2/lineage")
                .header("x-user", newOwner)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(event)))
                .andExpect(status().isCreated());

        // Verify doc updated
        verify(nsRepo).save(argThat(d -> d.getOwnerTeam().equals(newOwner)));
    }

    private RunEvent createEvent(String jobNamespace) {
        return new RunEvent(
                "START",
                ZonedDateTime.now(),
                new RunEvent.Run(UUID.randomUUID().toString(), Collections.emptyMap()),
                new Job(jobNamespace, "job", Collections.emptyMap()),
                Collections.emptyList(),
                Collections.emptyList(),
                "producer",
                "http://schema.url");
    }
}
