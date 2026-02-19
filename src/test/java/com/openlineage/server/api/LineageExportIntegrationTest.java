package com.openlineage.server.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.time.ZonedDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

import com.openlineage.server.storage.document.JobDocument;
import com.openlineage.server.storage.document.MarquezId;
import com.openlineage.server.storage.document.RunDocument;
import com.openlineage.server.storage.document.DatasetDocument;
import com.openlineage.server.storage.document.OutputDatasetFacetDocument;
import com.openlineage.server.domain.ColumnLineageDatasetFacet;

@SpringBootTest
@AutoConfigureMockMvc
@org.springframework.boot.autoconfigure.EnableAutoConfiguration(exclude = {
        org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration.class,
        org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration.class,
        org.springframework.boot.autoconfigure.data.mongo.MongoRepositoriesAutoConfiguration.class
})
public class LineageExportIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MongoTemplate mongoTemplate;

    @MockBean
    private com.openlineage.server.storage.repository.RunRepository runRepository;
    @MockBean
    private com.openlineage.server.storage.repository.DatasetRepository datasetRepository;
    @MockBean
    private com.openlineage.server.storage.repository.JobRepository jobRepository;
    @MockBean
    private com.openlineage.server.storage.repository.OutputDatasetFacetRepository outputFacetRepository;

    // Existing mocks to context loading
    @MockBean
    private com.openlineage.server.storage.repository.DataSourceRepository dataSourceRepository;
    @MockBean
    private com.openlineage.server.storage.repository.NamespaceRepository namespaceRepository;
    @MockBean
    private com.openlineage.server.storage.repository.TagRepository tagRepository;
    @MockBean
    private com.openlineage.server.service.GovernanceService governanceService;
    @MockBean
    private com.openlineage.server.storage.repository.InputDatasetFacetRepository inputDatasetFacetRepository;
    @MockBean
    private com.openlineage.server.storage.repository.LineageEventRepository lineageEventRepository;
    @MockBean
    private com.openlineage.server.storage.repository.LineageEdgeRepository lineageEdgeRepository;

    @Test
    public void testRecentLineageExport() throws Exception {
        String namespace = "test-ns";

        // Mock findDistinct namespaces
        when(mongoTemplate.findDistinct(any(Query.class), any(String.class), any(Class.class), any(Class.class)))
                .thenReturn(Collections.singletonList(namespace));

        // Mock Jobs
        MarquezId jobId = new MarquezId(namespace, "test-job");
        MarquezId inputId = new MarquezId(namespace, "input-ds");
        MarquezId outputId = new MarquezId(namespace, "output-ds");

        JobDocument job = new JobDocument();
        job.setId(jobId);
        job.setUpdatedAt(ZonedDateTime.now());
        job.setInputs(Set.of(inputId));
        job.setOutputs(Set.of(outputId));

        when(mongoTemplate.find(any(Query.class), any(Class.class)))
                .thenReturn(Collections.singletonList(job));

        // Mock Datasets
        DatasetDocument inputDs = new DatasetDocument(namespace, "input-ds", "src", Collections.emptyList(),
                ZonedDateTime.now());
        DatasetDocument outputDs = new DatasetDocument(namespace, "output-ds", "src", Collections.emptyList(),
                ZonedDateTime.now());

        when(datasetRepository.findAllById(any())).thenReturn(List.of(inputDs, outputDs));

        // Mock Run
        RunDocument run = new RunDocument();
        run.setEventTime(ZonedDateTime.now());
        run.setEventType("COMPLETE");
        when(runRepository.findByJobNamespaceAndJobName(any(), any(), any()))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(Collections.singletonList(run)));

        // Update: We need to mock OutputDatasetFacetRepository for column lineage
        // But for this simple test, we can skip or add it. Let's add simple one.
        OutputDatasetFacetDocument facetDoc = new OutputDatasetFacetDocument();
        facetDoc.setDatasetId(outputId);
        facetDoc.setFacets(Collections.singletonMap("columnLineage",
                new ColumnLineageDatasetFacet(
                        Map.of("outCol", new ColumnLineageDatasetFacet.Fields(
                                List.of(new ColumnLineageDatasetFacet.InputField(namespace, "input-ds", "inCol")),
                                "IDENTITY", "desc")))));
        when(outputFacetRepository.findAllById(any())).thenReturn(Collections.singletonList(facetDoc));

        // Trigger API
        mockMvc.perform(get("/api/v2/lineage-export/recent/30")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.namespaceData[0].namespaceName").value(namespace))
                .andExpect(jsonPath("$.namespaceData[0].jobLineage[0].jobName").value("test-job"))
                .andExpect(jsonPath("$.namespaceData[0].jobLineage[0].sourceDatasetName").value("input-ds"))
                .andExpect(jsonPath("$.namespaceData[0].columnLineage[0].sourceFieldName").value("inCol"));
    }
}
