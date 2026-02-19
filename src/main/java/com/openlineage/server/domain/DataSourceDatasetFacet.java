package com.openlineage.server.domain;

/**
 * Typed facet for the OpenLineage 'dataSource' dataset facet.
 * Captures the name and connection URI of a data source.
 * @see <a href="https://openlineage.io/docs/spec/facets/dataset-facets/datasource_dataset">OpenLineage Docs</a>
 */
public record DataSourceDatasetFacet(String name, String uri) implements Facet {
}
