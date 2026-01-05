package com.openlineage.server.storage;

import com.openlineage.server.domain.Facet;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.ZonedDateTime;
import java.util.Map;

@Document(collection = "datasets")
public class DatasetDocument {
    
    @Id
    private MarquezId id;
    private Map<String, Facet> facets;
    private String sourceName;
    private java.util.List<Object> fields;
    private java.util.Set<String> tags = new java.util.HashSet<>();
    private String description;
    private ZonedDateTime updatedAt;
    private ZonedDateTime createdAt;

    public DatasetDocument() {}

    public DatasetDocument(String namespace, String name, String sourceName, java.util.List<Object> fields, Map<String, Facet> facets, ZonedDateTime updatedAt) {
        this.id = new MarquezId(namespace, name);
        this.sourceName = sourceName;
        this.fields = fields;
        this.facets = facets;
        this.updatedAt = updatedAt;
        this.createdAt = ZonedDateTime.now(); // Default
    }

    public MarquezId getId() { return id; }
    public void setId(MarquezId id) { this.id = id; }
    public Map<String, Facet> getFacets() { return facets; }
    public void setFacets(Map<String, Facet> facets) { this.facets = facets; }
    public java.util.Set<String> getTags() { return tags; }
    public void setTags(java.util.Set<String> tags) { this.tags = tags; }
    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }
    public java.util.List<Object> getFields() { return fields; }
    public void setFields(java.util.List<Object> fields) { this.fields = fields; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public ZonedDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(ZonedDateTime updatedAt) { this.updatedAt = updatedAt; }
    public ZonedDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(ZonedDateTime createdAt) { this.createdAt = createdAt; }
}
