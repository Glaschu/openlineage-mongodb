package com.openlineage.server.api.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.ZonedDateTime;
import java.util.List;

public record NamespaceResponse(
    @JsonProperty("name") String name,
    @JsonProperty("createdAt") ZonedDateTime createdAt,
    @JsonProperty("updatedAt") ZonedDateTime updatedAt,
    @JsonProperty("ownerName") String ownerName,
    @JsonProperty("description") String description,
    @JsonProperty("isHidden") Boolean isHidden
) {
    public record NamespacesResponse(@JsonProperty("namespaces") List<NamespaceResponse> namespaces) {}
}
