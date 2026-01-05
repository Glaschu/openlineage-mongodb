package com.openlineage.server.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;

import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record Job(
    String namespace,
    String name,
    @JsonDeserialize(using = OpenLineageFacetsDeserializer.class)
    Map<String, Facet> facets
) {}
