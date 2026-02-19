package com.openlineage.server.service;

import com.openlineage.server.domain.Facet;
import com.openlineage.server.domain.Job;
import com.openlineage.server.domain.RunEvent;
import com.openlineage.server.storage.document.RunDocument;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RunServiceTest {

    @Mock
    private MongoTemplate mongoTemplate;

    @InjectMocks
    private RunService runService;

    @Test
    void shouldReplaceDotsInRunFacetKeys() {
        String namespace = "ns";
        String jobName = "job";
        String runId = UUID.randomUUID().toString();
        ZonedDateTime now = ZonedDateTime.now();

        Job job = mock(Job.class);
        when(job.namespace()).thenReturn(namespace);
        when(job.name()).thenReturn(jobName);

        Object facetValue = new Object();
        Map<String, Object> facets = Collections.singletonMap("io.openlineage.test.facet", facetValue);

        RunEvent.Run run = mock(RunEvent.Run.class);
        when(run.runId()).thenReturn(runId);
        when(run.facets()).thenReturn(facets);

        RunEvent event = mock(RunEvent.class);
        when(event.job()).thenReturn(job);
        when(event.run()).thenReturn(run);
        when(event.eventType()).thenReturn("RUNNING");
        when(event.eventTime()).thenReturn(now);

        runService.upsertRun(event);

        ArgumentCaptor<Update> updateCaptor = ArgumentCaptor.forClass(Update.class);
        verify(mongoTemplate).upsert(
                org.mockito.ArgumentMatchers.any(Query.class),
                updateCaptor.capture(),
                eq(RunDocument.class)
        );

        Update update = updateCaptor.getValue();
        org.bson.Document updateDoc = update.getUpdateObject();
        org.bson.Document setClause = (org.bson.Document) updateDoc.get("$set");

        assertThat(setClause).containsKey("runFacets.io_dot_openlineage_dot_test_dot_facet");
        assertThat(setClause).doesNotContainKey("runFacets.io.openlineage.test.facet");
        
        org.bson.Document setOnInsertClause = (org.bson.Document) updateDoc.get("$setOnInsert");
        assertThat(setOnInsertClause).containsKey("jobNamespace");
        assertThat(setOnInsertClause).containsKey("jobName");
        assertThat(setOnInsertClause).doesNotContainKey("job");
    }
}
