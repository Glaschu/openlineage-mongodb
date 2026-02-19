package com.openlineage.server.storage.document;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.ZonedDateTime;

/**
 * Materialized lineage edges for fast graph traversal.
 * 
 * Populated during event ingestion:
 * - Input datasets: edge from dataset → job (edgeType = "input")
 * - Output datasets: edge from job → dataset (edgeType = "output")
 * 
 * This avoids scanning the entire lineage_events collection to build the lineage graph.
 */
@Document(collection = "lineage_edges")
@CompoundIndexes({
        @CompoundIndex(name = "source_idx", def = "{'sourceNamespace': 1, 'sourceName': 1}"),
        @CompoundIndex(name = "target_idx", def = "{'targetNamespace': 1, 'targetName': 1}"),
        @CompoundIndex(name = "source_target_idx", def = "{'sourceNamespace': 1, 'sourceName': 1, 'targetNamespace': 1, 'targetName': 1}", unique = true)
})
public class LineageEdgeDocument {

    @Id
    private String id;

    private String sourceType; // "job" or "dataset"
    private String sourceNamespace;
    private String sourceName;

    private String targetType; // "job" or "dataset"
    private String targetNamespace;
    private String targetName;

    private String edgeType; // "input" or "output"

    @Indexed
    private ZonedDateTime updatedAt;

    public LineageEdgeDocument() {
    }

    public LineageEdgeDocument(String sourceType, String sourceNamespace, String sourceName,
            String targetType, String targetNamespace, String targetName,
            String edgeType, ZonedDateTime updatedAt) {
        this.sourceType = sourceType;
        this.sourceNamespace = sourceNamespace;
        this.sourceName = sourceName;
        this.targetType = targetType;
        this.targetNamespace = targetNamespace;
        this.targetName = targetName;
        this.edgeType = edgeType;
        this.updatedAt = updatedAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getSourceType() { return sourceType; }
    public void setSourceType(String sourceType) { this.sourceType = sourceType; }
    public String getSourceNamespace() { return sourceNamespace; }
    public void setSourceNamespace(String sourceNamespace) { this.sourceNamespace = sourceNamespace; }
    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }
    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }
    public String getTargetNamespace() { return targetNamespace; }
    public void setTargetNamespace(String targetNamespace) { this.targetNamespace = targetNamespace; }
    public String getTargetName() { return targetName; }
    public void setTargetName(String targetName) { this.targetName = targetName; }
    public String getEdgeType() { return edgeType; }
    public void setEdgeType(String edgeType) { this.edgeType = edgeType; }
    public ZonedDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(ZonedDateTime updatedAt) { this.updatedAt = updatedAt; }
}
