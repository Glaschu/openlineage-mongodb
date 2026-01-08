package com.openlineage.server.service;

import com.openlineage.server.domain.Job;
import com.openlineage.server.storage.JobDocument;
import com.openlineage.server.storage.JobRepository;
import com.openlineage.server.storage.MarquezId;
import org.springframework.stereotype.Service;

import java.time.ZonedDateTime;
import java.util.HashSet;
import java.util.Set;

@Service
public class JobService {

    private final JobRepository jobRepository;

    public JobService(JobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    public void upsertJob(Job job, ZonedDateTime eventTime, Set<MarquezId> inputs, Set<MarquezId> outputs) {
        JobDocument doc = jobRepository.findById(new MarquezId(job.namespace(), job.name()))
                .orElseGet(() -> {
                    JobDocument newDoc = new JobDocument(job.namespace(), job.name(), job.facets(), inputs, outputs,
                            eventTime);
                    newDoc.setCreatedAt(eventTime);
                    return newDoc;
                });

        if (doc.getInputs() == null)
            doc.setInputs(new HashSet<>());
        if (doc.getOutputs() == null)
            doc.setOutputs(new HashSet<>());

        if (!inputs.isEmpty())
            doc.getInputs().addAll(inputs);
        if (!outputs.isEmpty())
            doc.getOutputs().addAll(outputs);

        boolean changed = false;
        if (doc.getUpdatedAt().isBefore(eventTime)) {
            doc.setUpdatedAt(eventTime);
            changed = true;
        }
        if (job.facets() != null && !job.facets().isEmpty()) {
            doc.setFacets(job.facets()); // simple replace for job facets
            changed = true;
        }

        if (changed) {
            jobRepository.save(doc);
        }
    }
}
