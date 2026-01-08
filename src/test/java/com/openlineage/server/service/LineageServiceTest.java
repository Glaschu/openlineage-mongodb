package com.openlineage.server.service;

import com.openlineage.server.domain.Job;
import com.openlineage.server.domain.RunEvent;
import com.openlineage.server.storage.LineageEventRepository;
import com.openlineage.server.storage.NamespaceRegistryDocument;
import com.openlineage.server.storage.NamespaceRepository;
import com.openlineage.server.service.FacetMergeService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.web.server.ResponseStatusException;

import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.openlineage.server.storage.DatasetRepository;
import com.openlineage.server.storage.JobRepository;
import com.openlineage.server.storage.RunRepository;
import com.openlineage.server.storage.DataSourceRepository;

public class LineageServiceTest {

    private LineageService service;
    private LineageEventRepository eventRepo;
    private NamespaceRepository nsRepo;
    private JobRepository jobRepo;
    private DatasetRepository datasetRepo;
    private RunRepository runRepo;
    private DataSourceRepository dataSourceRepo;
    private FacetMergeService facetMergeService;

    @BeforeEach
    public void setup() {
        eventRepo = mock(LineageEventRepository.class);
        nsRepo = mock(NamespaceRepository.class);
        jobRepo = mock(JobRepository.class);
        datasetRepo = mock(DatasetRepository.class);
        runRepo = mock(RunRepository.class);
        dataSourceRepo = mock(DataSourceRepository.class);
        facetMergeService = mock(FacetMergeService.class);

        service = new LineageService(eventRepo, nsRepo, jobRepo, datasetRepo, runRepo, dataSourceRepo,
                facetMergeService);

        // Mock default behavior for RunRepo to avoid NPE in upsertRun
        when(runRepo.findById(any())).thenReturn(Optional.empty());
        // Mock default behavior for JobRepo
        when(jobRepo.findById(any())).thenReturn(Optional.empty());
        // Mock default behavior for DatasetRepo
        when(datasetRepo.findById(any())).thenReturn(Optional.empty());
    }

    @Test
    public void testAutoRegistration() {
        RunEvent event = new RunEvent("START", ZonedDateTime.now(),
                new RunEvent.Run("runId", null),
                new Job("new-ns", "job", null),
                null, null, "producer-x", null);

        when(nsRepo.findById("new-ns")).thenReturn(Optional.empty());

        service.ingestEvent(event);

        verify(nsRepo, times(1)).save(any(NamespaceRegistryDocument.class));
        verify(eventRepo, times(1)).save(any());
        verify(runRepo, times(1)).save(any()); // Verify run is saved
    }

    @Test
    public void testBlockedNamespace() {
        RunEvent event = new RunEvent("START", ZonedDateTime.now(),
                new RunEvent.Run("runId", null),
                new Job("locked-ns", "job", null),
                null, null, "rogue-producer", null);

        NamespaceRegistryDocument lockedNs = new NamespaceRegistryDocument("locked-ns", "team",
                List.of("official-producer"), true, null);
        when(nsRepo.findById("locked-ns")).thenReturn(Optional.of(lockedNs));

        Assertions.assertThrows(ResponseStatusException.class, () -> {
            service.ingestEvent(event);
        });

        verify(eventRepo, never()).save(any());
    }
}
