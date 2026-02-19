package com.openlineage.server.domain;

/**
 * Typed facet for the OpenLineage 'lifecycleStateChange' dataset facet.
 * Captures lifecycle transitions such as CREATE, ALTER, DROP, TRUNCATE, RENAME, OVERWRITE.
 * @see <a href="https://openlineage.io/docs/spec/facets/dataset-facets/lifecycle_state_change_dataset">OpenLineage Docs</a>
 */
public record LifecycleStateChangeDatasetFacet(String lifecycleStateChange, String previousIdentifier) implements Facet {
}
