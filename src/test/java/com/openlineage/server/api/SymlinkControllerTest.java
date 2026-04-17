package com.openlineage.server.api;

import com.openlineage.server.api.models.DatasetResponse;
import com.openlineage.server.mapper.DatasetMapper;
import com.openlineage.server.storage.document.DatasetDocument;
import com.openlineage.server.storage.document.InputDatasetFacetDocument;
import com.openlineage.server.storage.document.MarquezId;
import com.openlineage.server.storage.document.OutputDatasetFacetDocument;
import com.openlineage.server.storage.repository.DatasetRepository;
import com.openlineage.server.storage.repository.InputDatasetFacetRepository;
import com.openlineage.server.storage.repository.OutputDatasetFacetRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SymlinkController.class)
public class SymlinkControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MongoTemplate mongoTemplate;

    @MockBean
    private DatasetRepository datasetRepository;

    @MockBean
    private InputDatasetFacetRepository inputFacetRepository;

    @MockBean
    private OutputDatasetFacetRepository outputFacetRepository;

    @MockBean
    private DatasetMapper datasetMapper;

    @Test
    public void testListDatasetsBySymlinkReturnsEmpty() throws Exception {
        when(mongoTemplate.find(any(Query.class), eq(InputDatasetFacetDocument.class)))
            .thenReturn(Collections.emptyList());
        when(mongoTemplate.find(any(Query.class), eq(OutputDatasetFacetDocument.class)))
            .thenReturn(Collections.emptyList());
        when(datasetRepository.findAllById(any())).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v2/datasets/symlinks/s3-namespace"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.datasets").isArray())
            .andExpect(jsonPath("$.totalCount").value(0));
    }

    @Test
    public void testListDatasetsBySymlinkMatchesInput() throws Exception {
        MarquezId dsId = new MarquezId("db-ns", "orders-table");

        InputDatasetFacetDocument inputFacet = new InputDatasetFacetDocument();
        inputFacet.setDatasetId(dsId);

        DatasetDocument dataset = new DatasetDocument();
        dataset.setId(dsId);

        DatasetResponse response = mock(DatasetResponse.class);

        when(mongoTemplate.find(any(Query.class), eq(InputDatasetFacetDocument.class)))
            .thenReturn(List.of(inputFacet));
        when(mongoTemplate.find(any(Query.class), eq(OutputDatasetFacetDocument.class)))
            .thenReturn(Collections.emptyList());
        when(datasetRepository.findAllById(any())).thenReturn(List.of(dataset));
        when(inputFacetRepository.findById(dsId)).thenReturn(Optional.empty());
        when(outputFacetRepository.findById(dsId)).thenReturn(Optional.empty());
        when(datasetMapper.toResponse(eq(dataset), anyMap())).thenReturn(response);

        mockMvc.perform(get("/api/v2/datasets/symlinks/s3-namespace"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalCount").value(1));
    }
}
