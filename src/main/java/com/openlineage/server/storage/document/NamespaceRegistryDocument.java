package com.openlineage.server.storage.document;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Document(collection = "namespace_registry")
public class NamespaceRegistryDocument {

    @Id
    private String namespace;
    private String ownerTeam;
    private List<String> allowedProducers;
    private boolean isLocked;

    private String description;
    @Indexed
    private java.time.ZonedDateTime createdAt;
    private java.time.ZonedDateTime updatedAt;

    public NamespaceRegistryDocument() {
    }

    public NamespaceRegistryDocument(String namespace, String ownerTeam, List<String> allowedProducers,
            boolean isLocked, String description) {
        this.namespace = namespace;
        this.ownerTeam = ownerTeam;
        this.allowedProducers = allowedProducers;
        this.isLocked = isLocked;
        this.description = description;
        this.createdAt = java.time.ZonedDateTime.now();
        this.updatedAt = java.time.ZonedDateTime.now();
    }

    public String getNamespace() {
        return namespace;
    }

    public void setNamespace(String namespace) {
        this.namespace = namespace;
    }

    public String getOwnerTeam() {
        return ownerTeam;
    }

    public void setOwnerTeam(String ownerTeam) {
        this.ownerTeam = ownerTeam;
    }

    public List<String> getAllowedProducers() {
        return allowedProducers;
    }

    public void setAllowedProducers(List<String> allowedProducers) {
        this.allowedProducers = allowedProducers;
    }

    public boolean isLocked() {
        return isLocked;
    }

    public void setLocked(boolean locked) {
        isLocked = locked;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public java.time.ZonedDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(java.time.ZonedDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public java.time.ZonedDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(java.time.ZonedDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
