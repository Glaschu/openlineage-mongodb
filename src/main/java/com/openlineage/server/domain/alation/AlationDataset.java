package com.openlineage.server.domain.alation;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class AlationDataset {
    private Long id;

    @JsonProperty("name")
    private String name;

    @JsonProperty("name_in_datasource")
    private String nameInDatasource;

    @JsonProperty("schema_id")
    private Long schemaId;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getNameInDatasource() {
        return nameInDatasource;
    }

    public void setNameInDatasource(String nameInDatasource) {
        this.nameInDatasource = nameInDatasource;
    }

    public Long getSchemaId() {
        return schemaId;
    }

    public void setSchemaId(Long schemaId) {
        this.schemaId = schemaId;
    }
}
