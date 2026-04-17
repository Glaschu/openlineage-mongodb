package com.openlineage.server.service;

import com.openlineage.server.domain.*;
import com.openlineage.server.storage.document.DataSourceDocument;
import com.openlineage.server.storage.document.DatasetDocument;
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

public class DatasetServiceTest {

    private MongoTemplate mongoTemplate;
    private FacetMergeService facetMergeService;
    private VersionService versionService;
    private DatasetNameNormalizer nameNormalizer;
    private DatasetService datasetService;

    @BeforeEach
    public void setup() {
        mongoTemplate = mock(MongoTemplate.class);
        facetMergeService = mock(FacetMergeService.class);
        versionService = mock(VersionService.class);
        nameNormalizer = new DatasetNameNormalizer(true);
        datasetService = new DatasetService(mongoTemplate, facetMergeService, versionService, nameNormalizer);
    }

    @Test
    public void testUpsertDatasetNewDataset() {
        ZonedDateTime eventTime = ZonedDateTime.now();
        Map<String, Facet> facets = new HashMap<>();
        facets.put("documentation", new DocumentationFacet("Test description"));
        
        // Add tags
        Map<String, Object> tagsProps = new HashMap<>();
        tagsProps.put("tags", Arrays.asList("tag1", "tag2"));
        GenericFacet tagsFacet = new GenericFacet();
        tagsFacet.getAdditionalProperties().putAll(tagsProps);
        facets.put("tags", tagsFacet);

        Dataset dataset = new Dataset("my-namespace", "my-dataset", facets);

        UUID version = UUID.randomUUID();
        when(versionService.computeDatasetVersion(dataset)).thenReturn(version);
        when(mongoTemplate.findById(any(), eq(DatasetDocument.class))).thenReturn(null);

        UUID resultVersion = datasetService.upsertDataset(dataset, eventTime, true);

        assertEquals(version, resultVersion);

        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        ArgumentCaptor<Update> updateCaptor = ArgumentCaptor.forClass(Update.class);
        verify(mongoTemplate).upsert(queryCaptor.capture(), updateCaptor.capture(), eq(DatasetDocument.class));

        Update update = updateCaptor.getValue();
        assertTrue(update.getUpdateObject().get("$set").toString().contains("Test description"));
        
        verify(facetMergeService).mergeInputFacets(eq("my-namespace"), eq("my-dataset"), any(), eq(eventTime));
    }

    @Test
    public void testUpsertDatasetWithExistingVersionAndNoSchema() {
        ZonedDateTime eventTime = ZonedDateTime.now();
        Dataset dataset = new Dataset("my-namespace", "my-dataset", Collections.emptyMap());

        UUID existingVersion = UUID.randomUUID();
        DatasetDocument existingDoc = new DatasetDocument();
        existingDoc.setCurrentVersion(existingVersion);
        
        when(mongoTemplate.findById(any(), eq(DatasetDocument.class))).thenReturn(existingDoc);

        UUID resultVersion = datasetService.upsertDataset(dataset, eventTime, false);

        assertEquals(existingVersion, resultVersion);
        verify(facetMergeService).mergeOutputFacets(eq("my-namespace"), eq("my-dataset"), any(), eq(eventTime));
    }

    @Test
    public void testUpsertDatasetWithSchemaAndPartitions() {
        ZonedDateTime eventTime = ZonedDateTime.now();
        Map<String, Facet> facets = new HashMap<>();
        
        List<SchemaDatasetFacet.SchemaField> fields = Arrays.asList(
            new SchemaDatasetFacet.SchemaField("col1", "STRING", "A column")
        );
        facets.put("schema", new SchemaDatasetFacet(fields));

        Dataset dataset = new Dataset("my-namespace", "s3://bucket/data/year=2023", facets);

        UUID newVersion = UUID.randomUUID();
        when(versionService.computeDatasetVersion(dataset)).thenReturn(newVersion);
        when(mongoTemplate.findById(any(), eq(DatasetDocument.class))).thenReturn(null);

        UUID resultVersion = datasetService.upsertDataset(dataset, eventTime, true);

        assertEquals(newVersion, resultVersion);
        
        ArgumentCaptor<Update> updateCaptor = ArgumentCaptor.forClass(Update.class);
        verify(mongoTemplate).upsert(any(), updateCaptor.capture(), eq(DatasetDocument.class));
        Update update = updateCaptor.getValue();
        // The lastPartitionValues should be captured by $set
        assertTrue(update.getUpdateObject().get("$set").toString().contains("year=2023"));
    }

    @Test
    public void testUpsertDataSource() {
        ZonedDateTime eventTime = ZonedDateTime.now();
        datasetService.upsertDataSource("my-namespace", eventTime);

        verify(mongoTemplate).upsert(any(), any(), eq(DataSourceDocument.class));
    }

    @Test
    public void testNormalizeColumnLineageFacets() {
        ZonedDateTime eventTime = ZonedDateTime.now();
        Map<String, Facet> facets = new HashMap<>();

        ColumnLineageDatasetFacet.InputField inputField = new ColumnLineageDatasetFacet.InputField("ns", "s3://b/table/var=1", "col1");
        ColumnLineageDatasetFacet.Fields colFields = new ColumnLineageDatasetFacet.Fields(Collections.singletonList(inputField), "desc", "type");
        
        Map<String, ColumnLineageDatasetFacet.Fields> fieldsMap = new HashMap<>();
        fieldsMap.put("outCol", colFields);
        
        facets.put("columnLineage", new ColumnLineageDatasetFacet(fieldsMap));

        Dataset dataset = new Dataset("my-namespace", "my-dataset", facets);

        datasetService.upsertDataset(dataset, eventTime, true);

        ArgumentCaptor<Map<String, Facet>> facetsCaptor = ArgumentCaptor.forClass(Map.class);
        verify(facetMergeService).mergeInputFacets(any(), any(), facetsCaptor.capture(), any());

        Map<String, Facet> mergedFacets = facetsCaptor.getValue();
        assertTrue(mergedFacets.containsKey("columnLineage"));
        
        ColumnLineageDatasetFacet colFacet = (ColumnLineageDatasetFacet) mergedFacets.get("columnLineage");
        List<ColumnLineageDatasetFacet.InputField> inputs = colFacet.fields().get("outCol").inputFields();
        assertEquals(1, inputs.size());
        assertEquals("s3://b/table", inputs.get(0).name()); // Path should be normalized
    }
}
