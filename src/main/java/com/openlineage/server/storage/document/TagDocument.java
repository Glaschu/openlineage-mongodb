package com.openlineage.server.storage.document;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.ZonedDateTime;

@Document(collection = "tags")
public class TagDocument {
    @Id
    private String name;
    private String description;
    private ZonedDateTime updatedAt;

    public TagDocument() {}

    public TagDocument(String name, String description, ZonedDateTime updatedAt) {
        this.name = name;
        this.description = description;
        this.updatedAt = updatedAt;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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
