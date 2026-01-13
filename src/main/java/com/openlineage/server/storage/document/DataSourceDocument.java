package com.openlineage.server.storage.document;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.ZonedDateTime;

@Document(collection = "openlineage_datasources")
public class DataSourceDocument {
    @Id
    private String name; // e.g. "postgresql://host:port" or just name
    private String connectionUrl;
    private String type;
    private String description;
    private ZonedDateTime updatedAt;
    private ZonedDateTime createdAt;

    public DataSourceDocument() {
    }

    public DataSourceDocument(String name, String connectionUrl, ZonedDateTime createdAt) {
        this.name = name;
        this.connectionUrl = connectionUrl;
        this.createdAt = createdAt;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getConnectionUrl() {
        return connectionUrl;
    }

    public void setConnectionUrl(String connectionUrl) {
        this.connectionUrl = connectionUrl;
    }

    public ZonedDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(ZonedDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
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
}
