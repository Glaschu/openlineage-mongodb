package com.openlineage.server.api;

import com.openlineage.server.domain.Dataset;
import com.openlineage.server.domain.Job;
import com.openlineage.server.domain.RunEvent;
import com.openlineage.server.domain.RunEvent.Run;
import com.openlineage.server.storage.document.JobDocument;
import com.openlineage.server.storage.document.DatasetDocument;
import com.openlineage.server.storage.document.DataSourceDocument;
import com.openlineage.server.storage.document.MarquezId;
import com.openlineage.server.service.LineageService;
import org.bson.Document;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration;
import org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.ZonedDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

@SpringBootTest
@EnableAutoConfiguration(exclude = { MongoAutoConfiguration.class, MongoDataAutoConfiguration.class,
        org.springframework.boot.autoconfigure.data.mongo.MongoRepositoriesAutoConfiguration.class })
public class VersioningIntegrationTest {

    @Autowired
    private LineageService lineageService;

    @MockBean
    private MongoTemplate mongoTemplate;

    @MockBean
    private com.openlineage.server.storage.repository.JobRepository jobRepository;
    @MockBean
    private com.openlineage.server.storage.repository.DatasetRepository datasetRepository;
    @MockBean
    private com.openlineage.server.storage.repository.RunRepository runRepository;
    @MockBean
    private com.openlineage.server.storage.repository.DataSourceRepository dataSourceRepository;
    @MockBean
    private com.openlineage.server.storage.repository.NamespaceRepository namespaceRepository;
    @MockBean
    private com.openlineage.server.storage.repository.TagRepository tagRepository;
    @MockBean
    private com.openlineage.server.service.GovernanceService governanceService;

    @MockBean
    private com.openlineage.server.storage.repository.LineageEventRepository lineageEventRepository;
    @MockBean
    private com.openlineage.server.storage.repository.InputDatasetFacetRepository inputFacetRepository;
    @MockBean
    private com.openlineage.server.storage.repository.OutputDatasetFacetRepository outputFacetRepository;

    private Map<Object, Object> store = new HashMap<>();

    @BeforeEach
    void setup() {
        store.clear();

        // Mock findById
        when(mongoTemplate.findById(any(), any())).thenAnswer(invocation -> {
            Object id = invocation.getArgument(0);
            Class<?> type = invocation.getArgument(1);
            return store.get(id);
        });

        // Mock upsert
        when(mongoTemplate.upsert(any(Query.class), any(Update.class), any(Class.class))).thenAnswer(invocation -> {
            Query query = invocation.getArgument(0);
            Update update = invocation.getArgument(1);
            Class<?> entityClass = invocation.getArgument(2);

            // Extract ID from query - simplifying assumption for the test: query 'where _id
            // = ?'
            Document queryObj = query.getQueryObject();
            Object id = queryObj.get("_id");

            Object existing = store.get(id);
            if (existing == null) {
                try {
                    existing = entityClass.getDeclaredConstructor().newInstance();
                    if (existing instanceof DatasetDocument)
                        ((DatasetDocument) existing).setId((MarquezId) id);
                    if (existing instanceof JobDocument)
                        ((JobDocument) existing).setId((MarquezId) id);
                    if (existing instanceof DataSourceDocument)
                        return null; // Ignore data sources for this test
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            }

            // Apply updates manually (Partial implementation)
            Document updateObj = update.getUpdateObject();
            Document setMap = (Document) updateObj.get("$set");
            // Document addToSetMap = (Document) updateObj.get("$addToSet"); // Not used in
            // this test

            if (existing instanceof DatasetDocument) {
                DatasetDocument dd = (DatasetDocument) existing;
                if (setMap != null && setMap.containsKey("currentVersion"))
                    dd.setCurrentVersion((UUID) setMap.get("currentVersion"));
            } else if (existing instanceof JobDocument) {
                JobDocument jd = (JobDocument) existing;
                if (setMap != null && setMap.containsKey("currentVersion"))
                    jd.setCurrentVersion((UUID) setMap.get("currentVersion"));
            }

            store.put(id, existing);
            return null;
        });
    }

    @Test
    void testJobVersionChangesWithDatasetVersionChange() {
        String namespace = "version-test-ns";
        String jobName = "version-test-job";
        String dsName = "input-dataset";

        // 1. Initial Run with Schema A
        Dataset inputDs1 = createDatasetWithSchema(namespace, dsName, "col1", "string");
        RunEvent event1 = createEvent(namespace, jobName, Collections.singletonList(inputDs1));

        lineageService.ingestEvent(event1);

        JobDocument job1 = (JobDocument) store.get(new MarquezId(namespace, jobName));
        DatasetDocument ds1 = (DatasetDocument) store.get(new MarquezId(namespace, dsName));

        assertThat(job1).isNotNull();
        assertThat(ds1).isNotNull();
        UUID jobVersion1 = job1.getCurrentVersion();
        UUID dsVersion1 = ds1.getCurrentVersion();

        assertThat(jobVersion1).isNotNull();
        assertThat(dsVersion1).isNotNull();

        // 2. Second Run with Same Dataset (Same Schema) -> Should REUSE Version
        Dataset inputDs2 = createDatasetWithSchema(namespace, dsName, "col1", "string");
        RunEvent event2 = createEvent(namespace, jobName, Collections.singletonList(inputDs2));

        lineageService.ingestEvent(event2);

        JobDocument job2 = (JobDocument) store.get(new MarquezId(namespace, jobName));
        DatasetDocument ds2 = (DatasetDocument) store.get(new MarquezId(namespace, dsName));

        assertThat(ds2.getCurrentVersion()).isEqualTo(dsVersion1);
        assertThat(job2.getCurrentVersion()).isEqualTo(jobVersion1);

        // 3. Third Run with New Schema -> Should CHANGE Versions
        Dataset inputDs3 = createDatasetWithSchema(namespace, dsName, "col1", "int");
        RunEvent event3 = createEvent(namespace, jobName, Collections.singletonList(inputDs3));

        lineageService.ingestEvent(event3);

        JobDocument job3 = (JobDocument) store.get(new MarquezId(namespace, jobName));
        DatasetDocument ds3 = (DatasetDocument) store.get(new MarquezId(namespace, dsName));

        assertThat(ds3.getCurrentVersion()).isNotEqualTo(dsVersion1);
        assertThat(job3.getCurrentVersion()).isNotEqualTo(jobVersion1);
    }

    @Test
    void testDatasetVersionReuseWithEmptySchema() {
        String namespace = "version-test-ns-2";
        String jobName = "version-test-job-2";
        String dsName = "dataset-reuse";

        // 1. Initial Run with Schema
        Dataset inputDs1 = createDatasetWithSchema(namespace, dsName, "colA", "string");
        RunEvent event1 = createEvent(namespace, jobName, Collections.singletonList(inputDs1));
        lineageService.ingestEvent(event1);

        DatasetDocument ds1 = (DatasetDocument) store.get(new MarquezId(namespace, dsName));
        UUID v1 = ds1.getCurrentVersion();

        // 2. Run with Empty Schema -> Should Reuse Version
        Dataset inputDs2 = new Dataset(namespace, dsName, null);
        RunEvent event2 = createEvent(namespace, jobName, Collections.singletonList(inputDs2));
        lineageService.ingestEvent(event2);

        DatasetDocument ds2 = (DatasetDocument) store.get(new MarquezId(namespace, dsName));
        assertThat(ds2.getCurrentVersion()).isEqualTo(v1);

        // 3. Run with No Schema Facet -> Should Reuse Version
        Dataset inputDs3 = new Dataset(namespace, dsName, Collections.emptyMap());
        RunEvent event3 = createEvent(namespace, jobName, Collections.singletonList(inputDs3));
        lineageService.ingestEvent(event3);

        DatasetDocument ds3 = (DatasetDocument) store.get(new MarquezId(namespace, dsName));
        assertThat(ds3.getCurrentVersion()).isEqualTo(v1);
    }

    private Dataset createDatasetWithSchema(String ns, String name, String colName, String colType) {
        Map<String, com.openlineage.server.domain.Facet> facets = new HashMap<>();
        List<com.openlineage.server.domain.SchemaDatasetFacet.SchemaField> fields = Collections.singletonList(
                new com.openlineage.server.domain.SchemaDatasetFacet.SchemaField(colName, colType, null));
        facets.put("schema", new com.openlineage.server.domain.SchemaDatasetFacet(fields));
        return new Dataset(ns, name, facets);
    }

    private RunEvent createEvent(String ns, String jobName, List<Dataset> inputs) {
        return new RunEvent(
                "START",
                ZonedDateTime.now(),
                new RunEvent.Run(UUID.randomUUID().toString(), Collections.emptyMap()),
                new Job(ns, jobName, Collections.emptyMap()),
                inputs,
                Collections.emptyList(),
                "test-producer",
                "http://test.com");
    }
}
