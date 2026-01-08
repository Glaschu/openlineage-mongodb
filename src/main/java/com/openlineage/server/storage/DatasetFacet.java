package com.openlineage.server.storage;

import com.openlineage.server.domain.Facet;

import java.time.ZonedDateTime;
import java.util.Map;

public interface DatasetFacet {
    MarquezId getDatasetId();

    void setDatasetId(MarquezId datasetId);

    Map<String, Facet> getFacets();

    void setFacets(Map<String, Facet> facets);

    ZonedDateTime getUpdatedAt();

    void setUpdatedAt(ZonedDateTime updatedAt);
}
