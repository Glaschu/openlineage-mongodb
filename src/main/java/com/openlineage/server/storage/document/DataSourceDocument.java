package com.openlineage.server.storage.document;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.ZonedDateTime;

@Document(collection = "openlineage_datasources")
public class DataSourceDocument {
    @Id
    private String name; // e.g. "postgresql://host:port" or just name
    private String connectionUrl;
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
}
