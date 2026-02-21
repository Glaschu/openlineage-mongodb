package com.openlineage.server.service;

import com.openlineage.server.domain.Job;
import com.openlineage.server.domain.RunEvent;
import com.openlineage.server.storage.repository.LineageEventRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.web.server.ResponseStatusException;

import java.time.ZonedDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class LineageServiceTest {

    private LineageService service;
    private LineageEventRepository eventRepo;
    private GovernanceService governanceService;
    private JobService jobService;
    private RunService runService;
    private DatasetService datasetService;
    private org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    @BeforeEach
    public void setup() {
        eventRepo = mock(LineageEventRepository.class);
        governanceService = mock(GovernanceService.class);
        jobService = mock(JobService.class);
        runService = mock(RunService.class);
        datasetService = mock(DatasetService.class);
        mongoTemplate = mock(org.springframework.data.mongodb.core.MongoTemplate.class);

        service = new LineageService(eventRepo, governanceService, jobService, runService, datasetService, mongoTemplate);
    }

    @Test
    public void testAutoRegistrationCallsGovernance() {
        RunEvent event = new RunEvent("START", ZonedDateTime.now(),
                new RunEvent.Run("runId", null),
                new Job("new-ns", "job", null),
                null, null, "producer-x", null);

        service.ingestEvent(event);

        verify(governanceService, times(1)).validateOrRegisterNamespace("new-ns", "producer-x");
        verify(jobService, times(1)).upsertJob(any(), any(), any(), any(), any(), any());
        verify(runService, times(1)).upsertRun(any());
        verify(eventRepo, times(1)).save(any());
    }

    @Test
    public void testBlockedNamespacePropagatesException() {
        RunEvent event = new RunEvent("START", ZonedDateTime.now(),
                new RunEvent.Run("runId", null),
                new Job("locked-ns", "job", null),
                null, null, "rogue-producer", null);

        doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access Denied"))
                .when(governanceService).validateOrRegisterNamespace("locked-ns", "rogue-producer");

        Assertions.assertThrows(ResponseStatusException.class, () -> {
            service.ingestEvent(event);
        });

        verify(eventRepo, never()).save(any());
    }
}
