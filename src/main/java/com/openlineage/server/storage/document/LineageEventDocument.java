package com.openlineage.server.storage.document;

import com.openlineage.server.domain.RunEvent;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "lineage_events")
@CompoundIndexes({
    @CompoundIndex(name = "job_run_idx", def = "{'event.run.runId': 1, 'event.job.namespace': 1, 'event.job.name': 1, 'event.eventTime': 1}")
})
public class LineageEventDocument {
    
    @Id
    private String id;
    private RunEvent event;

    public LineageEventDocument() {}

    public LineageEventDocument(RunEvent event) {
        this.event = event;
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
}
