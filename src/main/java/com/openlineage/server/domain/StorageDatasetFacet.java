package com.openlineage.server.domain;

/**
 * Typed facet for the OpenLineage 'storage' dataset facet.
 * Captures the storage layer and file format of a dataset.
 * @see <a href="https://openlineage.io/docs/spec/facets/dataset-facets/storage_dataset">OpenLineage Docs</a>
 */
public record StorageDatasetFacet(String storageLayer, String fileFormat) implements Facet {
}
