package com.openlineage.server.api.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Optional;

public record TagResponse(
    @JsonProperty("name") String name,
    @JsonProperty("description") String description
) {
    public TagResponse(String name) {
        this(name, null);
    }
}
