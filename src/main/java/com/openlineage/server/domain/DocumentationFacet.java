package com.openlineage.server.domain;

/**
 * Typed facet for the OpenLineage 'documentation' facet.
 * Used for both Job and Dataset documentation facets.
 * @see <a href="https://openlineage.io/docs/spec/facets/dataset-facets/documentation_dataset">OpenLineage Docs</a>
 */
public record DocumentationFacet(String description) implements Facet {
}
