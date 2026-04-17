package com.openlineage.server.mapper;

import com.openlineage.server.api.models.LineageResponse.DatasetData;
import com.openlineage.server.api.models.LineageResponse.DatasetFieldData;
import com.openlineage.server.api.models.LineageResponse.JobData;
import com.openlineage.server.api.models.RunResponse;
import com.openlineage.server.domain.Facet;
import com.openlineage.server.domain.GenericFacet;
import com.openlineage.server.domain.SchemaDatasetFacet;
import com.openlineage.server.storage.document.DatasetDocument;
import com.openlineage.server.storage.document.JobDocument;
import com.openlineage.server.storage.document.MarquezId;
import com.openlineage.server.storage.document.RunDocument;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.ZonedDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class LineageNodeMapperTest {

    private RunMapper runMapper;
    private LineageNodeMapper mapper;

    @BeforeEach
    void setup() {
        runMapper = mock(RunMapper.class);
        mapper = new LineageNodeMapper(runMapper);
    }

    private JobDocument buildJob(String ns, String name) {
        JobDocument job = new JobDocument();
        job.setId(new MarquezId(ns, name));
        job.setUpdatedAt(ZonedDateTime.now());
        job.setCreatedAt(ZonedDateTime.now());
        job.setDescription("A test job");
        job.setLocation("http://github.com/repo");
        return job;
    }

    private DatasetDocument buildDataset(String ns, String name) {
        DatasetDocument ds = new DatasetDocument();
        ds.setId(new MarquezId(ns, name));
        ds.setUpdatedAt(ZonedDateTime.now());
        return ds;
    }

    // ── mapJob ────────────────────────────────────────────────────────────

    @Test
    void testMapJobWithNoRun() {
        JobDocument job = buildJob("test-ns", "my-job");
        JobData data = mapper.mapJob(job);

        assertNotNull(data);
        assertEquals("my-job", data.name());
        assertEquals("test-ns", data.namespace());
        assertNull(data.latestRun());
        assertNull(data.state());
    }

    @Test
    void testMapJobWithLatestRun() {
        JobDocument job = buildJob("test-ns", "my-job");
        RunDocument runDoc = new RunDocument();
        runDoc.setRunId("run-123");
        runDoc.setEventType("COMPLETE");

        RunResponse runResp = mock(RunResponse.class);
        when(runResp.state()).thenReturn("COMPLETED");
        when(runResp.durationMs()).thenReturn(5000L);
        when(runMapper.toRunResponse(runDoc)).thenReturn(runResp);

        JobData data = mapper.mapJob(job, runDoc);

        assertNotNull(data);
        assertEquals("COMPLETED", data.state());
        assertEquals("run-123", data.currentRunId());
        assertEquals(5000L, data.durationMs());
        assertEquals(runResp, data.latestRun());
    }

    @Test
    void testMapJobWithInputsAndOutputs() {
        JobDocument job = buildJob("ns", "etl-job");
        Set<MarquezId> inputs = new HashSet<>();
        inputs.add(new MarquezId("input-ns", "raw-table"));
        Set<MarquezId> outputs = new HashSet<>();
        outputs.add(new MarquezId("output-ns", "clean-table"));
        job.setInputs(inputs);
        job.setOutputs(outputs);

        JobData data = mapper.mapJob(job);

        assertTrue(data.inputs().contains("dataset:input-ns:raw-table"));
        assertTrue(data.outputs().contains("dataset:output-ns:clean-table"));
    }

    @Test
    void testMapJobWithParentJobName() {
        JobDocument job = buildJob("ns", "child-job");
        job.setParentJobName("parent-job");

        JobData data = mapper.mapJob(job);
        assertEquals("parent-job", data.parentJobName());
    }

    // ── mapDataset ─────────────────────────────────────────────────────────

    @Test
    void testMapDatasetBasic() {
        DatasetDocument ds = buildDataset("ds-ns", "orders");
        ds.setDescription("Order dataset");
        ds.setSourceName("mysql-source");

        DatasetData data = mapper.mapDataset(ds, Collections.emptyMap());

        assertEquals("orders", data.name());
        assertEquals("ds-ns", data.namespace());
        assertEquals("mysql-source", data.sourceName());
        assertEquals("Order dataset", data.description());
    }

    @Test
    void testMapDatasetWithFacets() {
        DatasetDocument ds = buildDataset("ns", "events");
        GenericFacet facet = new GenericFacet();
        facet.getAdditionalProperties().put("custom", "value");
        Map<String, Facet> facets = Map.of("custom", facet);

        DatasetData data = mapper.mapDataset(ds, facets);

        assertNotNull(data.facets());
        assertTrue(data.facets().containsKey("custom"));
    }

    @Test
    void testMapDatasetNullFields() {
        DatasetDocument ds = buildDataset("ns", "ds-with-nulls");
        ds.setFields(null);
        ds.setTags(null);

        DatasetData data = mapper.mapDataset(ds, Collections.emptyMap());
        assertNotNull(data);
        assertTrue(data.fields().isEmpty());
    }

    // ── mapSchemaToFields ─────────────────────────────────────────────────

    @Test
    void testMapSchemaToFieldsWithSchema() {
        DatasetDocument ds = buildDataset("ns", "orders");
        List<SchemaDatasetFacet.SchemaField> fields = List.of(
            new SchemaDatasetFacet.SchemaField("id", "INTEGER", null),
            new SchemaDatasetFacet.SchemaField("name", "STRING", null)
        );
        Map<String, Facet> facets = Map.of("schema", new SchemaDatasetFacet(fields));
        DatasetData dsData = mapper.mapDataset(ds, facets);

        List<DatasetFieldData> fieldData = mapper.mapSchemaToFields(dsData);

        assertEquals(2, fieldData.size());
        assertEquals("id", fieldData.get(0).field());
        assertEquals("name", fieldData.get(1).field());
        assertEquals("INTEGER", fieldData.get(0).type());
    }

    @Test
    void testMapSchemaToFieldsNoSchema() {
        DatasetDocument ds = buildDataset("ns", "ds");
        DatasetData dsData = mapper.mapDataset(ds, Collections.emptyMap());

        List<DatasetFieldData> fields = mapper.mapSchemaToFields(dsData);
        assertTrue(fields.isEmpty());
    }

    @Test
    void testMapSchemaToFieldsNonSchemaFacet() {
        DatasetDocument ds = buildDataset("ns", "ds");
        GenericFacet generic = new GenericFacet();
        generic.getAdditionalProperties().put("random", "value");
        DatasetData dsData = mapper.mapDataset(ds, Map.of("schema", generic));

        List<DatasetFieldData> fields = mapper.mapSchemaToFields(dsData);
        assertTrue(fields.isEmpty());
    }
}
