package com.openlineage.server.domain;

import java.util.List;
import java.util.Map;

public record ColumnLineageDatasetFacet(
    Map<String, Fields> fields
) implements Facet {
    public record Fields(List<InputField> inputFields, String transformationDescription, String transformationType) {}
    public record InputField(String namespace, String name, String field) {}
}
