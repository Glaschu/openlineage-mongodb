package com.openlineage.server.storage;

import com.openlineage.server.domain.Facet;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.ZonedDateTime;
import java.util.Map;
import java.util.UUID;

@Document(collection = "runs")
public class RunDocument {

    @Id
    private String runId;

    @Indexed
    private MarquezId job; // Links to Job

    private ZonedDateTime eventTime;
    private String eventType; // START, RUNNING, COMPLETE, FAIL, ABORT

    private Map<String, Facet> runFacets;

    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;

    public RunDocument() {
    }

    public RunDocument(String runId, MarquezId job, ZonedDateTime eventTime, String eventType,
            Map<String, Facet> runFacets) {
        this.runId = runId;
        this.job = job;
        this.eventTime = eventTime;
        this.eventType = eventType;
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
        return job;
    }

    public void setJob(MarquezId job) {
        this.job = job;
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
