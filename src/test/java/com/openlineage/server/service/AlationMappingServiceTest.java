package com.openlineage.server.service;

import com.openlineage.server.domain.alation.AlationColumn;
import com.openlineage.server.domain.alation.AlationDataset;
import com.openlineage.server.domain.alation.AlationSchema;
import com.openlineage.server.storage.document.AlationDatasetMappingDocument;
import com.openlineage.server.storage.document.DatasetDocument;
import com.openlineage.server.storage.document.MarquezId;
import com.openlineage.server.storage.document.MappingStatus;
import com.openlineage.server.storage.document.OutputDatasetFacetDocument;
import com.openlineage.server.storage.repository.AlationMappingRepository;
import com.openlineage.server.storage.repository.DatasetRepository;
import com.openlineage.server.storage.repository.OutputDatasetFacetRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AlationMappingServiceTest {

    @Mock
    private AlationMappingRepository mappingRepository;

    @Mock
    private AlationClientService alationClient;

    @Mock
    private DatasetRepository datasetRepository;

    @Mock
    private OutputDatasetFacetRepository outputFacetRepository;

    @InjectMocks
    private AlationMappingService mappingService;

    // AlationMappingService injects Optional<AlationClientService>, so we need
    // to construct it manually
    private AlationMappingService buildService() {
        return new AlationMappingService(
                mappingRepository,
                Optional.of(alationClient),
                datasetRepository,
                outputFacetRepository);
    }

    @Test
    void suggestMappings_callsGetSchemasByDsId() {
        AlationMappingService service = buildService();

        // OL datasets
        MarquezId dsId = new MarquezId("ns1", "orders");
        DatasetDocument olDs = new DatasetDocument();
        olDs.setId(dsId);

        when(datasetRepository.findByIdNamespace(eq("ns1"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(olDs)));
        when(mappingRepository.findByOpenLineageNamespace("ns1"))
                .thenReturn(Collections.emptyList());

        // Alation schemas
        AlationSchema schema = new AlationSchema();
        schema.setId(100L);
        schema.setName("public");
        schema.setDsId(10L);
        when(alationClient.getSchemasByDsId(10L)).thenReturn(List.of(schema));

        // Alation table match
        AlationDataset alTable = new AlationDataset();
        alTable.setId(500L);
        alTable.setName("orders");
        alTable.setSchemaId(100L);
        when(alationClient.searchTablesByName(100L, "orders")).thenReturn(List.of(alTable));
        when(alationClient.getColumnsForTable(500L)).thenReturn(Collections.emptyList());

        when(outputFacetRepository.findById(dsId)).thenReturn(Optional.empty());
        when(mappingRepository.findById("ns1:orders")).thenReturn(Optional.empty());

        service.suggestMappingsForDataSource("ns1", 10L);

        // Verify correct API flow
        verify(alationClient).getSchemasByDsId(10L);
        verify(alationClient).searchTablesByName(100L, "orders");
        verify(alationClient).getColumnsForTable(500L);
        verify(mappingRepository).save(argThat(doc ->
                doc.getAlationDatasetId().equals(500L)
                        && doc.getStatus() == MappingStatus.SUGGESTED
                        && doc.getConfidenceScore() > 0.4));
    }

    @Test
    void suggestMappings_skipsAcceptedMappings() {
        AlationMappingService service = buildService();

        MarquezId dsId = new MarquezId("ns1", "orders");
        DatasetDocument olDs = new DatasetDocument();
        olDs.setId(dsId);

        when(datasetRepository.findByIdNamespace(eq("ns1"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(olDs)));

        AlationDatasetMappingDocument accepted = new AlationDatasetMappingDocument();
        accepted.setOpenLineageDatasetName("orders");
        accepted.setStatus(MappingStatus.ACCEPTED);
        when(mappingRepository.findByOpenLineageNamespace("ns1"))
                .thenReturn(List.of(accepted));

        AlationSchema schema = new AlationSchema();
        schema.setId(100L);
        schema.setDsId(10L);
        when(alationClient.getSchemasByDsId(10L)).thenReturn(List.of(schema));

        service.suggestMappingsForDataSource("ns1", 10L);

        // Should never search Alation for an already-accepted dataset
        verify(alationClient, never()).searchTablesByName(anyLong(), anyString());
        verify(mappingRepository, never()).save(any());
    }

    @Test
    void suggestMappings_noSuggestionWhenNoMatch() {
        AlationMappingService service = buildService();

        MarquezId dsId = new MarquezId("ns1", "my_table");
        DatasetDocument olDs = new DatasetDocument();
        olDs.setId(dsId);

        when(datasetRepository.findByIdNamespace(eq("ns1"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(olDs)));
        when(mappingRepository.findByOpenLineageNamespace("ns1"))
                .thenReturn(Collections.emptyList());

        AlationSchema schema = new AlationSchema();
        schema.setId(100L);
        schema.setDsId(10L);
        when(alationClient.getSchemasByDsId(10L)).thenReturn(List.of(schema));

        // No matching table in Alation
        when(alationClient.searchTablesByName(100L, "my_table")).thenReturn(Collections.emptyList());

        service.suggestMappingsForDataSource("ns1", 10L);

        verify(mappingRepository, never()).save(any());
    }
}
