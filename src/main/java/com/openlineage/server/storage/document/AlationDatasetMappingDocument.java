package com.openlineage.server.storage.document;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "alation_mappings")
public class AlationDatasetMappingDocument {

    @Id
    private String id; // format: openLineageNamespace:openLineageDatasetName

    private String openLineageNamespace;
    private String openLineageDatasetName;

    private Long alationDatasetId;
    private String alationDatasetName;

    private double confidenceScore;
    private MappingStatus status;

    private Instant createdAt;
    private Instant updatedAt;

    public AlationDatasetMappingDocument() {
    }

    public AlationDatasetMappingDocument(String id, String openLineageNamespace, String openLineageDatasetName,
            Long alationDatasetId, String alationDatasetName,
            double confidenceScore, MappingStatus status,
            Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.openLineageNamespace = openLineageNamespace;
        this.openLineageDatasetName = openLineageDatasetName;
        this.alationDatasetId = alationDatasetId;
        this.alationDatasetName = alationDatasetName;
        this.confidenceScore = confidenceScore;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getOpenLineageNamespace() {
        return openLineageNamespace;
    }

    public void setOpenLineageNamespace(String openLineageNamespace) {
        this.openLineageNamespace = openLineageNamespace;
    }

    public String getOpenLineageDatasetName() {
        return openLineageDatasetName;
    }

    public void setOpenLineageDatasetName(String openLineageDatasetName) {
        this.openLineageDatasetName = openLineageDatasetName;
    }

    public Long getAlationDatasetId() {
        return alationDatasetId;
    }

    public void setAlationDatasetId(Long alationDatasetId) {
        this.alationDatasetId = alationDatasetId;
    }

    public String getAlationDatasetName() {
        return alationDatasetName;
    }

    public void setAlationDatasetName(String alationDatasetName) {
        this.alationDatasetName = alationDatasetName;
    }

    public double getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(double confidenceScore) {
        this.confidenceScore = confidenceScore;
    }

    public MappingStatus getStatus() {
        return status;
    }

    public void setStatus(MappingStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
