package com.openlineage.server.domain;

/**
 * Typed facet for the OpenLineage 'sql' job facet.
 * Captures the SQL query executed by a job.
 * @see <a href="https://openlineage.io/docs/spec/facets/job-facets/sql_job">OpenLineage Docs</a>
 */
public record SqlJobFacet(String query) implements Facet {
}
