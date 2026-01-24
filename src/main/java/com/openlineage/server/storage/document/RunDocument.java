package com.openlineage.server.storage.document;

import com.openlineage.server.domain.Dataset;
import com.openlineage.server.domain.Facet;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Document(collection = "runs")
@org.springframework.data.mongodb.core.index.CompoundIndexes({
        @org.springframework.data.mongodb.core.index.CompoundIndex(name = "job_run_idx", def = "{'jobNamespace': 1, 'jobName': 1, 'eventTime': -1}")
})
public class RunDocument {

    @Id
    private String runId;

    @Indexed
    private String jobNamespace;
    @Indexed
    private String jobName;

    private ZonedDateTime eventTime;
    private String eventType; // START, RUNNING, COMPLETE, FAIL, ABORT
    private ZonedDateTime startTime;
    private ZonedDateTime endTime;

    private List<Dataset> inputs;
    private List<Dataset> outputs;

    private Map<String, Facet> runFacets;

    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;

    public RunDocument() {
    }

    public RunDocument(String runId, MarquezId job, ZonedDateTime eventTime, String eventType,
            List<Dataset> inputs, List<Dataset> outputs, Map<String, Facet> runFacets) {
        this.runId = runId;
        if (job != null) {
            this.jobNamespace = job.getNamespace();
            this.jobName = job.getName();
        }
        this.eventTime = eventTime;
        this.eventType = eventType;
        this.inputs = inputs;
        this.outputs = outputs;
        this.runFacets = runFacets;
        this.createdAt = ZonedDateTime.now();
        this.updatedAt = ZonedDateTime.now();
    }

    public String getRunId() {
        return runId;
    }

    public void setRunId(String runId) {
        this.runId = runId;
    }

    public MarquezId getJob() {
        return new MarquezId(jobNamespace, jobName);
    }

    public void setJob(MarquezId job) {
        if (job != null) {
            this.jobNamespace = job.getNamespace();
            this.jobName = job.getName();
        }
    }

    public ZonedDateTime getEventTime() {
        return eventTime;
    }

    public void setEventTime(ZonedDateTime eventTime) {
        this.eventTime = eventTime;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public ZonedDateTime getStartTime() {
        return startTime;
    }

    public void setStartTime(ZonedDateTime startTime) {
        this.startTime = startTime;
    }

    public ZonedDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(ZonedDateTime endTime) {
        this.endTime = endTime;
    }

    public List<Dataset> getInputs() {
        return inputs;
    }

    public void setInputs(List<Dataset> inputs) {
        this.inputs = inputs;
    }

    public List<Dataset> getOutputs() {
        return outputs;
    }

    public void setOutputs(List<Dataset> outputs) {
        this.outputs = outputs;
    }

    public Map<String, Facet> getRunFacets() {
        return runFacets;
    }

    public void setRunFacets(Map<String, Facet> runFacets) {
        this.runFacets = runFacets;
    }

    public ZonedDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(ZonedDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public ZonedDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(ZonedDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
