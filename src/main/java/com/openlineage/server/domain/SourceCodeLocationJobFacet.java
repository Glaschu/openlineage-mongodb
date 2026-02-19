package com.openlineage.server.domain;

/**
 * Typed facet for the OpenLineage 'sourceCodeLocation' job facet.
 * Captures the source code location (type, URL, repo, path, tag, branch, version) of a job.
 * @see <a href="https://openlineage.io/docs/spec/facets/job-facets/source_code_location_job">OpenLineage Docs</a>
 */
public record SourceCodeLocationJobFacet(
        String type,
        String url,
        String repoUrl,
        String path,
        String version,
        String tag,
        String branch) implements Facet {
}
