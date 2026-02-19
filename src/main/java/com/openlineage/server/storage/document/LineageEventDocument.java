package com.openlineage.server.storage.document;

import com.openlineage.server.domain.RunEvent;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.ZonedDateTime;

@Document(collection = "lineage_events")
@CompoundIndexes({
    @CompoundIndex(name = "job_run_idx", def = "{'event.run.runId': 1, 'event.job.namespace': 1, 'event.job.name': 1, 'event.eventTime': 1}"),
    @CompoundIndex(name = "event_job_idx", def = "{'event.job.namespace': 1, 'event.job.name': 1}"),
    @CompoundIndex(name = "event_outputs_idx", def = "{'event.outputs.namespace': 1, 'event.outputs.name': 1}")
})
public class LineageEventDocument {
    
    @Id
    private String id;

    @Indexed(expireAfter = "90d")
    private ZonedDateTime createdAt;

    @Indexed
    private ZonedDateTime eventTime;

    private RunEvent event;

    public LineageEventDocument() {}

    public LineageEventDocument(RunEvent event) {
        this.event = event;
        this.createdAt = ZonedDateTime.now();
        this.eventTime = event.eventTime();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public RunEvent getEvent() {
        return event;
    }

    public void setEvent(RunEvent event) {
        this.event = event;
    }

    public ZonedDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(ZonedDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public ZonedDateTime getEventTime() {
        return eventTime;
    }

    public void setEventTime(ZonedDateTime eventTime) {
        this.eventTime = eventTime;
    }
}
