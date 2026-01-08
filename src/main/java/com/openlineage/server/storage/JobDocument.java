package com.openlineage.server.storage;

import com.openlineage.server.domain.Facet;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.ZonedDateTime;
import java.util.Map;

@Document(collection = "jobs")
public class JobDocument {

    @Id
    private MarquezId id;
    private Map<String, Facet> facets;
    private java.util.Set<MarquezId> inputs;
    private java.util.Set<MarquezId> outputs;
    private java.util.Set<String> tags = new java.util.HashSet<>();
    private String description;
    private String location;
    private ZonedDateTime updatedAt;

    @Indexed
    private ZonedDateTime createdAt;

    public JobDocument() {
    }

    public JobDocument(String namespace, String name, Map<String, Facet> facets, java.util.Set<MarquezId> inputs,
            java.util.Set<MarquezId> outputs, ZonedDateTime updatedAt) {
        this.id = new MarquezId(namespace, name);
        this.facets = facets;
        this.inputs = inputs;
        this.outputs = outputs;
        this.updatedAt = updatedAt;
        this.createdAt = ZonedDateTime.now(); // Default creation time
    }

    public MarquezId getId() {
        return id;
    }

    public void setId(MarquezId id) {
        this.id = id;
    }

    public Map<String, Facet> getFacets() {
        return facets;
    }

    public void setFacets(Map<String, Facet> facets) {
        this.facets = facets;
    }

    public java.util.Set<MarquezId> getInputs() {
        return inputs;
    }

    public void setInputs(java.util.Set<MarquezId> inputs) {
        this.inputs = inputs;
    }

    public java.util.Set<MarquezId> getOutputs() {
        return outputs;
    }

    public void setOutputs(java.util.Set<MarquezId> outputs) {
        this.outputs = outputs;
    }

    public java.util.Set<String> getTags() {
        return tags;
    }

    public void setTags(java.util.Set<String> tags) {
        this.tags = tags;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public ZonedDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(ZonedDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public ZonedDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(ZonedDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
