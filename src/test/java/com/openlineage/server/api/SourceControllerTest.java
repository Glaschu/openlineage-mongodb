package com.openlineage.server.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlineage.server.api.models.SourceResponse;
import com.openlineage.server.mapper.SourceMapper;
import com.openlineage.server.storage.document.DataSourceDocument;
import com.openlineage.server.storage.repository.DataSourceRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SourceController.class)
public class SourceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private DataSourceRepository repository;

    @MockBean
    private SourceMapper mapper;

    private SourceResponse sampleResponse() {
        return new SourceResponse("jdbc", "my-source", ZonedDateTime.now(), ZonedDateTime.now(), "jdbc:mysql://host/db", "A test source");
    }

    @Test
    public void testListSources() throws Exception {
        DataSourceDocument doc = new DataSourceDocument();
        when(repository.findAll()).thenReturn(List.of(doc));
        when(mapper.toResponse(doc)).thenReturn(sampleResponse());

        mockMvc.perform(get("/api/v2/sources"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sources").isArray())
            .andExpect(jsonPath("$.sources[0].name").value("my-source"));
    }

    @Test
    public void testGetSource() throws Exception {
        DataSourceDocument doc = new DataSourceDocument();
        when(repository.findById("my-source")).thenReturn(Optional.of(doc));
        when(mapper.toResponse(doc)).thenReturn(sampleResponse());

        mockMvc.perform(get("/api/v2/sources/my-source"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("my-source"));
    }

    @Test
    public void testGetSourceNotFound() throws Exception {
        when(repository.findById("missing")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v2/sources/missing"))
            .andExpect(status().isNotFound());
    }

    @Test
    public void testCreateOrUpdateSource() throws Exception {
        DataSourceDocument doc = new DataSourceDocument();
        doc.setCreatedAt(ZonedDateTime.now());

        when(repository.findById("new-source")).thenReturn(Optional.empty());
        when(repository.save(any(DataSourceDocument.class))).thenReturn(doc);
        when(mapper.toResponse(any(DataSourceDocument.class))).thenReturn(sampleResponse());

        mockMvc.perform(put("/api/v2/sources/new-source")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("my-source"));
    }
}
