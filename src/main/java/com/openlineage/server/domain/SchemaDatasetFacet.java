package com.openlineage.server.domain;

import java.util.List;

public record SchemaDatasetFacet(
    List<SchemaField> fields
) implements Facet {
    // Nested record for fields
    public record SchemaField(String name, String type, String description) {}
}
