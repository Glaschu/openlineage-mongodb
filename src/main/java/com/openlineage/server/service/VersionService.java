package com.openlineage.server.service;

import com.openlineage.server.domain.Dataset;
import com.openlineage.server.domain.Job;
import com.openlineage.server.storage.document.MarquezId;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Service
public class VersionService {

    private final DatasetNameNormalizer nameNormalizer;

    public VersionService(DatasetNameNormalizer nameNormalizer) {
        this.nameNormalizer = nameNormalizer;
    }

    public UUID computeJobVersion(Job job, java.util.Map<MarquezId, UUID> inputs,
            java.util.Map<MarquezId, UUID> outputs) {
        // Version = UUID(Namespace + Name + Inputs(with versions) + Outputs(with
        // versions) + Location + Context)
        StringBuilder sb = new StringBuilder();
        sb.append(job.namespace());
        sb.append(job.name());

        if (inputs != null) {
            inputs.entrySet().stream()
                    .sorted((e1, e2) -> e1.getKey().toString().compareTo(e2.getKey().toString()))
                    .forEach(e -> {
                        sb.append(e.getKey().toString());
                        sb.append(e.getValue().toString());
                    });
        }
        if (outputs != null) {
            outputs.entrySet().stream()
                    .sorted((e1, e2) -> e1.getKey().toString().compareTo(e2.getKey().toString()))
                    .forEach(e -> {
                        sb.append(e.getKey().toString());
                        sb.append(e.getValue().toString());
                    });
        }

        // Location would be part of it if available in Job domain, currently not in
        // simple Job object
        // but we can add facets if needed. keeping it simple for now to match logic.

        return UUID.nameUUIDFromBytes(sb.toString().getBytes(StandardCharsets.UTF_8));
    }

    public UUID computeDatasetVersion(Dataset dataset) {
        // Version = UUID(Namespace + Name + SourceName + Fields + Tags)
        StringBuilder sb = new StringBuilder();
        sb.append(dataset.namespace());
        sb.append(nameNormalizer.normalize(dataset.name()));

        // SourceName is usually namespace for now
        sb.append(dataset.namespace());

        // Fields from schema
        if (dataset.facets() != null && dataset.facets().containsKey("schema")) {
            // simplified field hashing
            sb.append(dataset.facets().get("schema").toString());
        }

        return UUID.nameUUIDFromBytes(sb.toString().getBytes(StandardCharsets.UTF_8));
    }
}
