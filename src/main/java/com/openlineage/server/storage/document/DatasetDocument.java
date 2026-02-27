package com.openlineage.server.storage.document;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.index.TextIndexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.ZonedDateTime;
import java.util.Map;

@Document(collection = "datasets")
@org.springframework.data.mongodb.core.index.CompoundIndexes({
        @org.springframework.data.mongodb.core.index.CompoundIndex(name = "dataset_namespace_updated_idx", def = "{'id.namespace': 1, 'updatedAt': -1}")
})
public class DatasetDocument {

    @Id
    private MarquezId id;
    private String sourceName;
    private java.util.List<Object> fields;
    private java.util.Set<String> tags = new java.util.HashSet<>();
    private String description;
    @Indexed
    private ZonedDateTime updatedAt;
    @Indexed
    private ZonedDateTime createdAt;
    private java.util.UUID currentVersion;
    private Boolean isDeleted = false;

    /** Denormalized name field for DocumentDB text search (mirrors _id.name). */
    @TextIndexed
    private String searchName;

    /** Latest partition key-value pairs extracted from the raw dataset name. */
    private Map<String, String> lastPartitionValues;

    /**
     * Symlink identifiers: accumulates all raw partition names seen for this
     * dataset.
     */
    private java.util.List<Map<String, String>> symlinks;

    public DatasetDocument() {
    }

    public DatasetDocument(String namespace, String name, String sourceName, java.util.List<Object> fields,
            ZonedDateTime updatedAt) {
        this.id = new MarquezId(namespace, name);
        this.searchName = name;
        this.sourceName = sourceName;
        this.fields = fields;
        this.updatedAt = updatedAt;
        this.createdAt = ZonedDateTime.now(); // Default
    }

    // Facets field removed as part of data splitting strategy. Facets are now in
    // input/output_dataset_facets collections.

    public MarquezId getId() {
        return id;
    }

    public void setId(MarquezId id) {
        this.id = id;
    }

    public java.util.Set<String> getTags() {
        return tags;
    }

    public void setTags(java.util.Set<String> tags) {
        this.tags = tags;
    }

    public String getSourceName() {
        return sourceName;
    }

    public void setSourceName(String sourceName) {
        this.sourceName = sourceName;
    }

    public java.util.List<Object> getFields() {
        return fields;
    }

    public void setFields(java.util.List<Object> fields) {
        this.fields = fields;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
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

    public java.util.UUID getCurrentVersion() {
        return currentVersion;
    }

    public void setCurrentVersion(java.util.UUID currentVersion) {
        this.currentVersion = currentVersion;
    }

    public Boolean getIsDeleted() {
        return isDeleted;
    }

    public void setIsDeleted(Boolean isDeleted) {
        this.isDeleted = isDeleted;
    }

    public String getSearchName() {
        return searchName;
    }

    public void setSearchName(String searchName) {
        this.searchName = searchName;
    }

    public Map<String, String> getLastPartitionValues() {
        return lastPartitionValues;
    }

    public void setLastPartitionValues(Map<String, String> lastPartitionValues) {
        this.lastPartitionValues = lastPartitionValues;
    }

    public java.util.List<Map<String, String>> getSymlinks() {
        return symlinks;
    }

    public void setSymlinks(java.util.List<Map<String, String>> symlinks) {
        this.symlinks = symlinks;
    }
}
