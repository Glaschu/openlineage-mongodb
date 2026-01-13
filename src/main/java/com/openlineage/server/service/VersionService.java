package com.openlineage.server.service;

import com.openlineage.server.domain.Dataset;
import com.openlineage.server.domain.Job;
import com.openlineage.server.storage.document.MarquezId;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class VersionService {

    public UUID computeJobVersion(Job job, java.util.Set<MarquezId> inputs, java.util.Set<MarquezId> outputs) {
        // Version = UUID(Namespace + Name + Inputs + Outputs + Location + Context)
        // Simplified deterministic generation
        StringBuilder sb = new StringBuilder();
        sb.append(job.namespace());
        sb.append(job.name());

        if (inputs != null) {
            inputs.stream().map(MarquezId::toString).sorted().forEach(sb::append);
        }
        if (outputs != null) {
            outputs.stream().map(MarquezId::toString).sorted().forEach(sb::append);
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
        sb.append(dataset.name());

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
