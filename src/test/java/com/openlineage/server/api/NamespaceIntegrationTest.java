package com.openlineage.server.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlineage.server.storage.NamespaceRegistryDocument;
import com.openlineage.server.storage.NamespaceRepository;
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
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@EnableAutoConfiguration(exclude = {MongoAutoConfiguration.class, MongoDataAutoConfiguration.class, org.springframework.boot.autoconfigure.data.mongo.MongoRepositoriesAutoConfiguration.class})
public class NamespaceIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper mapper;

    @MockBean
    private NamespaceRepository nsRepo;

    // Mock other repos to satisfy LineageService dependency if needed, 
    // though we are testing specific controllers here.
    @MockBean
    private com.openlineage.server.storage.LineageEventRepository eventRepo;
    @MockBean
    private com.openlineage.server.storage.JobRepository jobRepo;
    @MockBean
    private com.openlineage.server.storage.DatasetRepository datasetRepo;
    @MockBean
    private com.openlineage.server.storage.TagRepository tagRepo;

    @BeforeEach
    public void setup() {
        // Default mocks
        when(nsRepo.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    public void testCreateNoDescription() throws Exception {
        String nsName = "NO_DESCRIPTION";
        NamespaceRegistryDocument doc = new NamespaceRegistryDocument(nsName, "owner", null, false, null);
        
        // Mock save returning the doc with timestamps
        when(nsRepo.save(any())).thenReturn(doc);
        when(nsRepo.findById(nsName)).thenReturn(Optional.of(doc));

        mockMvc.perform(put("/api/v1/namespaces/" + nsName)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(doc)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(nsName))
                .andExpect(jsonPath("$.ownerName").value("owner"))
                .andExpect(jsonPath("$.description").doesNotExist()) // or null
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.updatedAt").exists());
    }

    @Test
    public void testChangeOwner() throws Exception {
        String nsName = "HOME_NAMESPACE";
        NamespaceRegistryDocument initialDoc = new NamespaceRegistryDocument(nsName, "daniel", null, false, "desc");
        
        when(nsRepo.findById(nsName)).thenReturn(Optional.of(initialDoc));
        when(nsRepo.save(any())).thenAnswer(i -> i.getArgument(0)); // Return what's saved

        // Update Owner
        NamespaceRegistryDocument updateDoc = new NamespaceRegistryDocument(nsName, "willy", null, false, "desc");
        
        mockMvc.perform(put("/api/v1/namespaces/" + nsName)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(updateDoc)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(nsName))
                .andExpect(jsonPath("$.ownerName").value("willy"))
                .andExpect(jsonPath("$.description").value("desc"));
    }

    @Test
    public void testGetNamespace() throws Exception {
        String nsName = "GET_TEST";
        NamespaceRegistryDocument doc = new NamespaceRegistryDocument(nsName, "owner", null, false, "desc");
        doc.setCreatedAt(ZonedDateTime.now());
        doc.setUpdatedAt(ZonedDateTime.now());
        
        when(nsRepo.findById(nsName)).thenReturn(Optional.of(doc));

        mockMvc.perform(get("/api/v1/namespaces/" + nsName))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(nsName))
                .andExpect(jsonPath("$.ownerName").value("owner"))
                .andExpect(jsonPath("$.description").value("desc"))
                .andExpect(jsonPath("$.isHidden").value(false));
    }

    @Test
    public void testDeleteNamespace() throws Exception {
        String nsName = "DELETE_TEST";
        
        when(nsRepo.existsById(nsName)).thenReturn(true);
        doNothing().when(nsRepo).deleteById(nsName);

        mockMvc.perform(delete("/api/v1/namespaces/" + nsName))
                .andExpect(status().isNoContent());

        verify(nsRepo, times(1)).deleteById(nsName);
    }
}
