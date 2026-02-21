package com.openlineage.server.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Typed facet for the OpenLineage 'symlinks' dataset facet.
 *
 * @see <a href="https://openlineage.io/docs/spec/facets/dataset-facets/symlinks_dataset">OpenLineage Docs</a>
 */
public record SymlinksDatasetFacet(
        @JsonProperty("_producer") String _producer,
        @JsonProperty("_schemaURL") String _schemaURL,
        @JsonProperty("identifiers") List<Identifier> identifiers) implements Facet {

    public record Identifier(
            @JsonProperty("namespace") String namespace,
            @JsonProperty("name") String name,
            @JsonProperty("type") String type) {
    }
}
