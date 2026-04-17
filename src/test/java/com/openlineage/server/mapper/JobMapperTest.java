package com.openlineage.server.mapper;

import com.openlineage.server.api.models.JobResponse;
import com.openlineage.server.api.models.RunResponse;
import com.openlineage.server.storage.document.JobDocument;
import com.openlineage.server.storage.document.MarquezId;
import com.openlineage.server.storage.document.RunDocument;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.ZonedDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class JobMapperTest {

    private RunMapper runMapper;
    private JobMapper jobMapper;

    @BeforeEach
    void setup() {
        runMapper = mock(RunMapper.class);
        jobMapper = new JobMapper(runMapper);
    }

    private JobDocument buildJob() {
        JobDocument job = new JobDocument();
        job.setId(new MarquezId("ns", "my-job"));
        job.setCreatedAt(ZonedDateTime.now());
        job.setUpdatedAt(ZonedDateTime.now());
        job.setDescription("A mapped job");
        job.setLocation("http://github.com/job");
        Set<MarquezId> inputs = new HashSet<>(List.of(new MarquezId("ns", "input-ds")));
        Set<MarquezId> outputs = new HashSet<>(List.of(new MarquezId("ns", "output-ds")));
        job.setInputs(inputs);
        job.setOutputs(outputs);
        return job;
    }

    @Test
    void testToResponseNoRuns() {
        JobDocument job = buildJob();
        JobResponse response = jobMapper.toResponse(job, Collections.emptyList());

        assertNotNull(response);
        assertEquals("my-job", response.name());
        assertEquals("ns", response.namespace());
        assertNull(response.latestRun());
        assertNull(response.state());
        assertFalse(response.inputs().isEmpty());
        assertFalse(response.outputs().isEmpty());
    }

    @Test
    void testToResponseWithRuns() {
        JobDocument job = buildJob();
        RunDocument runDoc = new RunDocument();
        RunResponse runResponse = mock(RunResponse.class);
        when(runResponse.state()).thenReturn("COMPLETED");
        when(runResponse.durationMs()).thenReturn(1234L);
        when(runMapper.toRunResponse(runDoc)).thenReturn(runResponse);

        JobResponse response = jobMapper.toResponse(job, List.of(runDoc));

        assertEquals("COMPLETED", response.state());
        assertEquals(1234L, response.durationMs());
        assertNotNull(response.latestRun());
        assertEquals(1, response.latestRuns().size());
    }

    @Test
    void testToResponseNullInputsOutputs() {
        JobDocument job = buildJob();
        job.setInputs(null);
        job.setOutputs(null);

        JobResponse response = jobMapper.toResponse(job, Collections.emptyList());
        assertTrue(response.inputs().isEmpty());
        assertTrue(response.outputs().isEmpty());
    }

    @Test
    void testToResponseWithParentJob() {
        JobDocument job = buildJob();
        job.setParentJobName("parent-etl");
        job.setParentJobUuid(UUID.randomUUID());

        JobResponse response = jobMapper.toResponse(job, Collections.emptyList());
        assertEquals("parent-etl", response.parentJobName());
        assertNotNull(response.parentJobUuid());
    }

    @Test
    void testToResponseUsesUpdatedAtWhenNoCreatedAt() {
        JobDocument job = buildJob();
        ZonedDateTime updated = ZonedDateTime.now();
        job.setCreatedAt(null);
        job.setUpdatedAt(updated);

        JobResponse response = jobMapper.toResponse(job, Collections.emptyList());
        assertEquals(updated, response.createdAt());
    }
}
