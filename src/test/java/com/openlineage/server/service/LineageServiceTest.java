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
    private DatasetNameNormalizer nameNormalizer;

    @BeforeEach
    public void setup() {
        eventRepo = mock(LineageEventRepository.class);
        governanceService = mock(GovernanceService.class);
        jobService = mock(JobService.class);
        runService = mock(RunService.class);
        datasetService = mock(DatasetService.class);
        mongoTemplate = mock(org.springframework.data.mongodb.core.MongoTemplate.class);
        nameNormalizer = new DatasetNameNormalizer(true);

        service = new LineageService(eventRepo, governanceService, jobService, runService, datasetService,
                mongoTemplate, nameNormalizer);
    }

    @Test
    public void testAutoRegistrationCallsGovernance() {
        RunEvent event = new RunEvent("START", ZonedDateTime.now(),
                new RunEvent.Run("runId", null),
                new Job("new-ns", "job", null),
                null, null, "producer-x", null);

        service.ingestEvent(event);

        verify(governanceService, times(1)).validateOrRegisterNamespace("new-ns", "producer-x");
        verify(jobService, times(1)).upsertJob(any(), any(), any(), any(), any(), any(), any(), anyBoolean());
        verify(runService, times(1)).upsertRun(any(), anyBoolean());
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
    @Test
    public void testIngestEventWithInputsOutputsAndParent() {
        java.util.Map<String, Object> jobMap = new java.util.HashMap<>();
        jobMap.put("namespace", "parent-ns");
        jobMap.put("name", "parent-job");

        java.util.Map<String, Object> parentMap = new java.util.HashMap<>();
        parentMap.put("job", jobMap);

        java.util.Map<String, Object> runFacets = new java.util.HashMap<>();
        com.openlineage.server.domain.GenericFacet parentFacet = new com.openlineage.server.domain.GenericFacet();
        parentFacet.getAdditionalProperties().putAll(parentMap);
        runFacets.put("parent", parentFacet);

        com.openlineage.server.domain.Dataset inputDs = new com.openlineage.server.domain.Dataset("in-ns", "in-name", null);
        com.openlineage.server.domain.Dataset outputDs = new com.openlineage.server.domain.Dataset("out-ns", "out-name", null);

        RunEvent event = new RunEvent("COMPLETE", ZonedDateTime.now(),
                new RunEvent.Run("runId2", runFacets),
                new Job("job-ns", "job-name", null),
                java.util.Collections.singletonList(inputDs),
                java.util.Collections.singletonList(outputDs),
                "producer-x", "schema-url");

        com.openlineage.server.storage.document.JobDocument existingJob = new com.openlineage.server.storage.document.JobDocument();
        existingJob.setLatestRunId("oldRunId");
        
        when(mongoTemplate.findById(any(), eq(com.openlineage.server.storage.document.JobDocument.class))).thenReturn(existingJob);
        when(datasetService.upsertDataset(any(), any(), anyBoolean())).thenReturn(java.util.UUID.randomUUID());

        service.ingestEvent(event, "owner1");

        // Verify that governance validates the job namespace ownership
        verify(governanceService, times(1)).validateJobNamespaceOwnership("job-ns", "owner1");

        // Verify dataset upserts are called
        verify(datasetService, times(1)).upsertDataset(eq(inputDs), any(), eq(true));
        verify(datasetService, times(1)).upsertDataset(eq(outputDs), any(), eq(false));
        
        // Ensure lineage edges are deleted before inserting for a new run
        verify(mongoTemplate, times(2)).remove(any(org.springframework.data.mongodb.core.query.Query.class), eq(com.openlineage.server.storage.document.LineageEdgeDocument.class));
        verify(mongoTemplate, times(2)).upsert(any(org.springframework.data.mongodb.core.query.Query.class), any(org.springframework.data.mongodb.core.query.Update.class), eq(com.openlineage.server.storage.document.LineageEdgeDocument.class));

        // verify event saved
        verify(eventRepo, times(1)).save(any());
    }
}
