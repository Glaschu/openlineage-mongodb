package com.openlineage.server.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlineage.server.api.models.LineageResponse;
import com.openlineage.server.domain.*;
import com.openlineage.server.storage.document.*;
import com.openlineage.server.storage.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.time.ZonedDateTime;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = OpenLineageResource.class)
public class OpenLineageResourceTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MongoTemplate mongoTemplate;

    @MockBean
    private JobRepository jobRepository;

    @MockBean
    private DatasetRepository datasetRepository;

    @MockBean
    private LineageEventRepository eventRepository;

    @MockBean
    private InputDatasetFacetRepository inputFacetRepository;

    @MockBean
    private OutputDatasetFacetRepository outputFacetRepository;

    @MockBean
    private LineageEdgeRepository lineageEdgeRepository;

    @MockBean
    private com.openlineage.server.mapper.LineageNodeMapper lineageNodeMapper;

    // ── Helpers ────────────────────────────────────────────────────────────

    private JobDocument buildJob(String ns, String name) {
        JobDocument job = new JobDocument();
        job.setId(new MarquezId(ns, name));
        job.setUpdatedAt(ZonedDateTime.now());
        return job;
    }

    private DatasetDocument buildDataset(String ns, String name) {
        DatasetDocument ds = new DatasetDocument();
        ds.setId(new MarquezId(ns, name));
        ds.setUpdatedAt(ZonedDateTime.now());
        return ds;
    }

    private LineageResponse.JobData mockJobData(String name) {
        return new LineageResponse.JobData(
            name, "JOB", name, name,
            ZonedDateTime.now(), ZonedDateTime.now(), "ns",
            Collections.emptySet(), Collections.emptySet(),
            Collections.emptySet(), Collections.emptySet(),
            null, null, null, null, null, null, null, null);
    }

    private LineageResponse.DatasetData mockDatasetData(String ns, String name) {
        return new LineageResponse.DatasetData(
            name, "DB_TABLE", name, name,
            ZonedDateTime.now(), ZonedDateTime.now(), ns,
            null, Collections.emptyList(), null,
            ZonedDateTime.now(), null, Collections.emptyMap());
    }

    // ── /lineage — basic cases ─────────────────────────────────────────────

    @Test
    public void testGetLineageEmptyJob() throws Exception {
        when(mongoTemplate.find(any(), eq(JobDocument.class))).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v2/lineage")
                .param("nodeId", "job:default:my-job")
                .param("depth", "5"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.graph").isArray());
    }

    @Test
    public void testGetLineageJobWithInputsAndOutputs() throws Exception {
        MarquezId jobId = new MarquezId("ns", "etl-job");
        JobDocument job = buildJob("ns", "etl-job");
        Set<MarquezId> inputs = new HashSet<>(List.of(new MarquezId("ns", "raw-data")));
        Set<MarquezId> outputs = new HashSet<>(List.of(new MarquezId("ns", "clean-data")));
        job.setInputs(inputs);
        job.setOutputs(outputs);

        when(mongoTemplate.find(any(), eq(JobDocument.class))).thenReturn(Collections.emptyList());
        when(jobRepository.findAllById(anyList())).thenReturn(List.of(job));
        when(datasetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(inputFacetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(outputFacetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(mongoTemplate.find(any(), eq(LineageEdgeDocument.class))).thenReturn(Collections.emptyList());
        when(mongoTemplate.findOne(any(), eq(RunDocument.class))).thenReturn(null);
        when(lineageNodeMapper.mapJob(eq(job))).thenReturn(mockJobData("etl-job"));
        when(lineageNodeMapper.mapJob(eq(job), any())).thenReturn(mockJobData("etl-job"));

        mockMvc.perform(get("/api/v2/lineage")
                .param("nodeId", "job:ns:etl-job")
                .param("depth", "2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.graph").isArray());
    }

    @Test
    public void testGetLineageDatasetWithEdges() throws Exception {
        DatasetDocument ds = buildDataset("ns", "orders");

        LineageEdgeDocument edge = new LineageEdgeDocument();
        edge.setSourceType("job");
        edge.setSourceNamespace("ns");
        edge.setSourceName("etl-job");
        edge.setTargetType("dataset");
        edge.setTargetNamespace("ns");
        edge.setTargetName("orders");

        when(datasetRepository.findAllById(anyList())).thenReturn(List.of(ds));
        when(inputFacetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(outputFacetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(jobRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(mongoTemplate.find(any(), eq(LineageEdgeDocument.class))).thenReturn(List.of(edge));
        when(lineageNodeMapper.mapDataset(eq(ds), anyMap())).thenReturn(mockDatasetData("ns", "orders"));

        mockMvc.perform(get("/api/v2/lineage")
                .param("nodeId", "dataset:ns:orders")
                .param("depth", "2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.graph").isArray());
    }

    @Test
    public void testGetLineageEmptyDataset() throws Exception {
        mockMvc.perform(get("/api/v2/lineage")
                .param("nodeId", "dataset:default:my-dataset")
                .param("depth", "5"))
            .andExpect(status().isOk());
    }

    // ── /lineage — aggregate by parent ─────────────────────────────────────

    @Test
    public void testGetLineageAggregateByParentNoParent() throws Exception {
        JobDocument job = buildJob("ns", "child-job");
        job.setParentJobName(null);

        when(mongoTemplate.find(any(), eq(JobDocument.class))).thenReturn(List.of(job));
        when(jobRepository.findById(new MarquezId("ns", "child-job"))).thenReturn(Optional.of(job));
        when(jobRepository.findAllById(anyList())).thenReturn(List.of(job));
        when(datasetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(inputFacetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(outputFacetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(mongoTemplate.find(any(), eq(LineageEdgeDocument.class))).thenReturn(Collections.emptyList());
        when(mongoTemplate.findOne(any(), eq(RunDocument.class))).thenReturn(null);
        when(lineageNodeMapper.mapJob(any(JobDocument.class))).thenReturn(mockJobData("child-job"));
        when(lineageNodeMapper.mapJob(any(JobDocument.class), any())).thenReturn(mockJobData("child-job"));

        mockMvc.perform(get("/api/v2/lineage")
                .param("nodeId", "job:ns:child-job")
                .param("aggregateByParent", "true"))
            .andExpect(status().isOk());
    }

    @Test
    public void testGetLineageAggregateByParentWithParent() throws Exception {
        JobDocument job = buildJob("ns", "child-job");
        job.setParentJobName("parent-job");

        JobDocument parentJob = buildJob("ns", "parent-job");

        when(jobRepository.findById(new MarquezId("ns", "child-job"))).thenReturn(Optional.of(job));
        // siblings query
        when(mongoTemplate.find(any(), eq(JobDocument.class)))
            .thenReturn(List.of(parentJob));
        when(jobRepository.findAllById(anyList())).thenReturn(List.of(job));
        when(datasetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(inputFacetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(outputFacetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(mongoTemplate.find(any(), eq(LineageEdgeDocument.class))).thenReturn(Collections.emptyList());
        when(mongoTemplate.findOne(any(), eq(RunDocument.class))).thenReturn(null);
        when(lineageNodeMapper.mapJob(any(JobDocument.class))).thenReturn(mockJobData("child-job"));
        when(lineageNodeMapper.mapJob(any(JobDocument.class), any())).thenReturn(mockJobData("child-job"));

        mockMvc.perform(get("/api/v2/lineage")
                .param("nodeId", "job:ns:child-job")
                .param("aggregateByParent", "true"))
            .andExpect(status().isOk());
    }

    // ── /lineage — symlink ─────────────────────────────────────────────────

    @Test
    public void testGetLineageSymlinkResolvesViaInput() throws Exception {
        InputDatasetFacetDocument inFacet = new InputDatasetFacetDocument(
            new MarquezId("ns", "orders"), Collections.emptyMap(), ZonedDateTime.now());

        when(mongoTemplate.findOne(any(), eq(InputDatasetFacetDocument.class))).thenReturn(inFacet);
        when(datasetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(inputFacetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(outputFacetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(mongoTemplate.find(any(), eq(LineageEdgeDocument.class))).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v2/lineage")
                .param("nodeId", "symlink:s3-ns:s3://bucket/orders"))
            .andExpect(status().isOk());
    }

    @Test
    public void testGetLineageSymlinkResolvesViaOutput() throws Exception {
        OutputDatasetFacetDocument outFacet = new OutputDatasetFacetDocument();
        outFacet.setDatasetId(new MarquezId("ns", "orders"));

        when(mongoTemplate.findOne(any(), eq(InputDatasetFacetDocument.class))).thenReturn(null);
        when(mongoTemplate.findOne(any(), eq(OutputDatasetFacetDocument.class))).thenReturn(outFacet);
        when(datasetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(inputFacetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(outputFacetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(mongoTemplate.find(any(), eq(LineageEdgeDocument.class))).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v2/lineage")
                .param("nodeId", "symlink:s3-ns:s3://bucket/orders"))
            .andExpect(status().isOk());
    }

    @Test
    public void testGetLineageSymlinkNotFound() throws Exception {
        when(mongoTemplate.findOne(any(), eq(InputDatasetFacetDocument.class))).thenReturn(null);
        when(mongoTemplate.findOne(any(), eq(OutputDatasetFacetDocument.class))).thenReturn(null);

        mockMvc.perform(get("/api/v2/lineage")
                .param("nodeId", "symlink:bad-ns:bad-name"))
            .andExpect(status().isNotFound());
    }

    // ── /column-lineage ────────────────────────────────────────────────────

    @Test
    public void testGetColumnLineageEmpty() throws Exception {
        when(datasetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(inputFacetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(outputFacetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v2/column-lineage")
                .param("nodeId", "dataset:ns:events"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.graph").isArray());
    }

    @Test
    public void testGetColumnLineageWithSchemaFacet() throws Exception {
        DatasetDocument ds = buildDataset("ns", "orders");
        List<SchemaDatasetFacet.SchemaField> fields = List.of(
            new SchemaDatasetFacet.SchemaField("id", "INTEGER", null),
            new SchemaDatasetFacet.SchemaField("amount", "DOUBLE", null)
        );
        SchemaDatasetFacet schemaFacet = new SchemaDatasetFacet(fields);

        InputDatasetFacetDocument inFacet = new InputDatasetFacetDocument(
            new MarquezId("ns", "orders"), Map.of("schema", schemaFacet), ZonedDateTime.now());

        LineageResponse.DatasetData dsData = mockDatasetData("ns", "orders");

        when(datasetRepository.findAllById(anyList())).thenReturn(List.of(ds));
        when(inputFacetRepository.findAllById(anyList())).thenReturn(List.of(inFacet));
        when(outputFacetRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(lineageNodeMapper.mapDataset(eq(ds), anyMap())).thenReturn(dsData);
        when(lineageNodeMapper.mapSchemaToFields(any())).thenReturn(List.of(
            new LineageResponse.DatasetFieldData("ns", "orders", "id", "id", "column", "INTEGER"),
            new LineageResponse.DatasetFieldData("ns", "orders", "amount", "amount", "column", "DOUBLE")
        ));

        mockMvc.perform(get("/api/v2/column-lineage")
                .param("nodeId", "dataset:ns:orders"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.graph").isArray());
    }

    // ── /events/lineage ────────────────────────────────────────────────────

    @Test
    public void testGetEventsLineageBasic() throws Exception {
        Page<LineageEventDocument> page = new PageImpl<>(Collections.emptyList());
        when(eventRepository.findByEventTimeBetween(any(), any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/v2/events/lineage")
                .param("limit", "10")
                .param("offset", "0"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalCount").value(0));
    }

    @Test
    public void testGetEventsLineageWithEvents() throws Exception {
        RunEvent runEvent = new RunEvent(
            "COMPLETE", ZonedDateTime.now(),
            new RunEvent.Run("run-1", Collections.emptyMap()),
            new Job("ns", "etl", null),
            Collections.emptyList(), Collections.emptyList(),
            "producer", "schema");

        LineageEventDocument doc = new LineageEventDocument();
        doc.setEvent(runEvent);

        Page<LineageEventDocument> page = new PageImpl<>(List.of(doc));
        when(eventRepository.findByEventTimeBetween(any(), any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/v2/events/lineage")
                .param("limit", "5"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalCount").value(1))
            .andExpect(jsonPath("$.events").isArray());
    }

    @Test
    public void testGetEventsLineageClamsLimitAbove200() throws Exception {
        Page<LineageEventDocument> page = new PageImpl<>(Collections.emptyList());
        when(eventRepository.findByEventTimeBetween(any(), any(), any())).thenReturn(page);

        // limit=999 should be clamped to 200 internally without error
        mockMvc.perform(get("/api/v2/events/lineage")
                .param("limit", "999")
                .param("offset", "0"))
            .andExpect(status().isOk());
    }

    @Test
    public void testGetEventsLineageWithDateFilters() throws Exception {
        Page<LineageEventDocument> page = new PageImpl<>(Collections.emptyList());
        when(eventRepository.findByEventTimeBetween(any(), any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/v2/events/lineage")
                .param("after", "2024-01-01T00:00:00Z")
                .param("before", "2024-12-31T23:59:59Z"))
            .andExpect(status().isOk());
    }
}
