package com.openlineage.server.service;

import com.openlineage.server.domain.*;
import com.openlineage.server.storage.document.JobDocument;
import com.openlineage.server.storage.document.MarquezId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.time.ZonedDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

public class JobServiceTest {

    private MongoTemplate mongoTemplate;
    private VersionService versionService;
    private JobService jobService;

    @BeforeEach
    public void setup() {
        mongoTemplate = mock(MongoTemplate.class);
        versionService = mock(VersionService.class);
        jobService = new JobService(mongoTemplate, versionService);
    }

    @Test
    public void testUpsertJobNewRun() {
        ZonedDateTime eventTime = ZonedDateTime.now();
        Map<String, Facet> facets = new HashMap<>();
        facets.put("documentation", new DocumentationFacet("Test job description"));
        facets.put("sourceCodeLocation", new SourceCodeLocationJobFacet("github", "http://github.com/my-job", null, null, null, null, null));

        Job job = new Job("my-namespace", "my-job", facets);

        Map<MarquezId, UUID> inputs = new HashMap<>();
        inputs.put(new MarquezId("in-ns", "in-name"), UUID.randomUUID());

        Map<MarquezId, UUID> outputs = new HashMap<>();
        outputs.put(new MarquezId("out-ns", "out-name"), UUID.randomUUID());

        UUID version = UUID.randomUUID();
        when(versionService.computeJobVersion(eq(job), any(), any())).thenReturn(version);

        jobService.upsertJob(job, eventTime, inputs, outputs, "parent-job", UUID.randomUUID(), "run123", true);

        ArgumentCaptor<Update> updateCaptor = ArgumentCaptor.forClass(Update.class);
        verify(mongoTemplate).upsert(any(Query.class), updateCaptor.capture(), eq(JobDocument.class));

        Update update = updateCaptor.getValue();
        String updateStr = update.getUpdateObject().toString();
        
        // As it's a new run, we expect it uses $set for inputs/outputs
        assertTrue(updateStr.contains("inputs"));
        assertTrue(updateStr.contains("outputs"));
        assertTrue(updateStr.contains("Test job description"));
        assertTrue(updateStr.contains("http://github.com/my-job"));
        assertTrue(updateStr.contains("parent-job"));
    }

    @Test
    public void testUpsertJobSameRunAndGenericFacets() {
        ZonedDateTime eventTime = ZonedDateTime.now();
        Map<String, Facet> facets = new HashMap<>();

        Map<String, Object> docProps = new HashMap<>();
        docProps.put("description", "Generic description");
        GenericFacet genericDoc = new GenericFacet();
        genericDoc.getAdditionalProperties().putAll(docProps);
        facets.put("documentation", genericDoc);

        Map<String, Object> codeProps = new HashMap<>();
        codeProps.put("url", "http://generic-url.com");
        GenericFacet genericCode = new GenericFacet();
        genericCode.getAdditionalProperties().putAll(codeProps);
        facets.put("sourceCodeLocation", genericCode);

        Job job = new Job("my-namespace", "my-job", facets);

        Map<MarquezId, UUID> inputs = new HashMap<>();
        inputs.put(new MarquezId("in-ns", "in-name"), UUID.randomUUID());

        Map<MarquezId, UUID> outputs = new HashMap<>();
        outputs.put(new MarquezId("out-ns", "out-name"), UUID.randomUUID());

        jobService.upsertJob(job, eventTime, inputs, outputs, null, null, "run123", false);

        ArgumentCaptor<Update> updateCaptor = ArgumentCaptor.forClass(Update.class);
        verify(mongoTemplate).upsert(any(Query.class), updateCaptor.capture(), eq(JobDocument.class));

        Update update = updateCaptor.getValue();
        String updateStr = update.getUpdateObject().toString();
        
        // As it's exactly SAME run, we expect it uses $addToSet for inputs/outputs
        assertTrue(updateStr.contains("$addToSet"));
        assertTrue(updateStr.contains("Generic description"));
        assertTrue(updateStr.contains("http://generic-url.com"));
    }
}
