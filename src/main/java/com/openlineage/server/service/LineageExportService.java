package com.openlineage.server.service;

import com.openlineage.server.api.models.LineageExportModels.*;
import com.openlineage.server.domain.ColumnLineageDatasetFacet;
import com.openlineage.server.domain.Facet;
import com.openlineage.server.storage.document.*;
import com.openlineage.server.storage.repository.JobRepository;
import com.openlineage.server.storage.repository.RunRepository;
import com.openlineage.server.storage.repository.DatasetRepository;
import com.openlineage.server.storage.repository.OutputDatasetFacetRepository;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class LineageExportService {

    private final MongoTemplate mongoTemplate;
    // jobRepository unused in direct MongoTemplate calls but kept for reference or
    // future use if needed
    // private final JobRepository jobRepository;
    private final DatasetRepository datasetRepository;
    private final RunRepository runRepository;
    private final OutputDatasetFacetRepository outputFacetRepository;

    public LineageExportService(MongoTemplate mongoTemplate, JobRepository jobRepository,
            DatasetRepository datasetRepository, RunRepository runRepository,
            OutputDatasetFacetRepository outputFacetRepository) {
        this.mongoTemplate = mongoTemplate;
        // this.jobRepository = jobRepository;
        this.datasetRepository = datasetRepository;
        this.runRepository = runRepository;
        this.outputFacetRepository = outputFacetRepository;
    }

    public LineageExportResult exportLineage(int days, List<String> requestedNamespaces) {
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);

        // 1. Identify Target Namespaces
        List<String> namespaces;
        if (requestedNamespaces != null && !requestedNamespaces.isEmpty()) {
            namespaces = requestedNamespaces;
        } else {
            namespaces = mongoTemplate.findDistinct(
                    Query.query(Criteria.where("updatedAt").gte(since)),
                    "_id.namespace",
                    JobDocument.class,
                    String.class);
        }

        List<NamespaceLineageData> nsDataList = new ArrayList<>();

        for (String ns : namespaces) {
            nsDataList.add(processNamespace(ns, since));
        }

        return new LineageExportResult(nsDataList);
    }

    private NamespaceLineageData processNamespace(String namespace, Instant since) {
        // Fetch Jobs in this namespace updated recently
        List<JobDocument> jobs = mongoTemplate.find(
                Query.query(Criteria.where("_id.namespace").is(namespace).and("updatedAt").gte(since)),
                JobDocument.class);

        List<JobLineageRow> jobRows = new ArrayList<>();
        List<ColumnLineageRow> colRows = new ArrayList<>();

        // Cache datasets
        Set<MarquezId> datasetIdsToFetch = new HashSet<>();
        for (JobDocument job : jobs) {
            if (job.getInputs() != null)
                datasetIdsToFetch.addAll(job.getInputs());
            if (job.getOutputs() != null)
                datasetIdsToFetch.addAll(job.getOutputs());
        }

        Map<MarquezId, DatasetDocument> datasetMap = new HashMap<>();
        if (!datasetIdsToFetch.isEmpty()) {
            datasetRepository.findAllById(datasetIdsToFetch).forEach(d -> datasetMap.put(d.getId(), d));
        }

        for (JobDocument job : jobs) {
            // Get latest run for status
            RunDocument lastRun = runRepository.findByJobNamespaceAndJobNameOrderByEventTimeDesc(
                    job.getId().getNamespace(), job.getId().getName())
                    .stream().findFirst().orElse(null);

            String lastRunState = (lastRun != null) ? lastRun.getEventType() : null;
            Instant lastRunTime = (lastRun != null) ? lastRun.getEventTime().toInstant() : null;

            Set<MarquezId> inputs = job.getInputs() == null ? Collections.emptySet() : job.getInputs();
            Set<MarquezId> outputs = job.getOutputs() == null ? Collections.emptySet() : job.getOutputs();

            for (MarquezId inputId : inputs) {
                DatasetDocument inputDs = datasetMap.get(inputId);
                for (MarquezId outputId : outputs) {
                    DatasetDocument outputDs = datasetMap.get(outputId);

                    jobRows.add(new JobLineageRow(
                            getUuid(inputId), inputId.getNamespace(), inputId.getName(), getPhysicalName(inputDs),
                            getUuid(outputId), outputId.getNamespace(), outputId.getName(), getPhysicalName(outputDs),
                            getUuid(job.getId()), job.getId().getNamespace(), job.getId().getName(), "JOB",
                            null, // Desc
                            lastRunTime, lastRunState,
                            job.getUpdatedAt() != null ? job.getUpdatedAt().toInstant() : null));

                    // Column Lineage logic
                    if (outputDs != null) {
                        processColumnLineage(outputDs, inputId, colRows);
                    }
                }
            }
        }

        return new NamespaceLineageData(
                UUID.nameUUIDFromBytes(namespace.getBytes(StandardCharsets.UTF_8)),
                namespace,
                jobRows,
                colRows,
                jobRows.size(),
                colRows.size());
    }

    private void processColumnLineage(DatasetDocument outputDs, MarquezId inputId, List<ColumnLineageRow> rows) {
        // Facets are stored separately
        Optional<OutputDatasetFacetDocument> facetDoc = outputFacetRepository.findById(outputDs.getId());
        if (facetDoc.isEmpty() || facetDoc.get().getFacets() == null)
            return;

        Facet facet = facetDoc.get().getFacets().get("columnLineage");
        if (!(facet instanceof ColumnLineageDatasetFacet))
            return;

        ColumnLineageDatasetFacet colLineage = (ColumnLineageDatasetFacet) facet;
        if (colLineage.fields() == null)
            return;

        for (Map.Entry<String, ColumnLineageDatasetFacet.Fields> entry : colLineage.fields().entrySet()) {
            String outputFieldName = entry.getKey();
            ColumnLineageDatasetFacet.Fields fields = entry.getValue();

            for (ColumnLineageDatasetFacet.InputField inputField : fields.inputFields()) {
                if (inputField.namespace().equals(inputId.getNamespace())
                        && inputField.name().equals(inputId.getName())) {
                    rows.add(new ColumnLineageRow(
                            getUuid(new MarquezId(inputField.namespace(), inputField.name())),
                            inputField.namespace(),
                            inputField.name(),
                            null,
                            inputField.field(),
                            null,
                            getUuid(outputDs.getId()),
                            outputDs.getId().getNamespace(),
                            outputDs.getId().getName(),
                            null,
                            outputFieldName,
                            null,
                            fields.transformationType(),
                            fields.transformationDescription(),
                            outputDs.getUpdatedAt() != null ? outputDs.getUpdatedAt().toInstant() : null));
                }
            }
        }
    }

    private String getUuid(MarquezId id) {
        return UUID.nameUUIDFromBytes(id.toString().getBytes(StandardCharsets.UTF_8)).toString();
    }

    private String getPhysicalName(DatasetDocument ds) {
        // Assuming name maps to physical name if not explicitly available
        return ds != null ? ds.getId().getName() : "";
    }
}
