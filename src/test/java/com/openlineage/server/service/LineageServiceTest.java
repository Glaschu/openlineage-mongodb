package com.openlineage.server.service;

import com.openlineage.server.domain.Job;
import com.openlineage.server.domain.RunEvent;
import com.openlineage.server.storage.LineageEventRepository;
import com.openlineage.server.storage.NamespaceRegistryDocument;
import com.openlineage.server.storage.NamespaceRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.openlineage.server.storage.DatasetRepository;
import com.openlineage.server.storage.JobRepository;

public class LineageServiceTest {

    private LineageService service;
    private LineageEventRepository eventRepo;
    private NamespaceRepository nsRepo;
    private JobRepository jobRepo;
    private DatasetRepository datasetRepo;

    @BeforeEach
    public void setup() {
        eventRepo = mock(LineageEventRepository.class);
        nsRepo = mock(NamespaceRepository.class);
        jobRepo = mock(JobRepository.class);
        datasetRepo = mock(DatasetRepository.class);
        service = new LineageService(eventRepo, nsRepo, jobRepo, datasetRepo);
    }

    @Test
    public void testAutoRegistration() {
        RunEvent event = new RunEvent("START", null, 
            new RunEvent.Run("runId", null), 
            new Job("new-ns", "job", null), 
            null, null, "producer-x", null);

        when(nsRepo.findById("new-ns")).thenReturn(Optional.empty());

        service.ingestEvent(event);

        verify(nsRepo, times(1)).save(any(NamespaceRegistryDocument.class));
        verify(eventRepo, times(1)).save(any());
    }

    @Test
    public void testBlockedNamespace() {
        RunEvent event = new RunEvent("START", null, 
            new RunEvent.Run("runId", null), 
            new Job("locked-ns", "job", null), 
            null, null, "rogue-producer", null);

        NamespaceRegistryDocument lockedNs = new NamespaceRegistryDocument("locked-ns", "team", List.of("official-producer"), true, null);
        when(nsRepo.findById("locked-ns")).thenReturn(Optional.of(lockedNs));

        Assertions.assertThrows(ResponseStatusException.class, () -> {
            service.ingestEvent(event);
        });

        verify(eventRepo, never()).save(any());
    }
}
