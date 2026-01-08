package com.openlineage.server.storage.document;

import com.openlineage.server.domain.Facet;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.ZonedDateTime;
import java.util.Map;

@Document(collection = "output_dataset_output_facets")
public class OutputDatasetFacetDocument implements DatasetFacet {

    @Id
    private MarquezId datasetId; // Namespace + Name

    private Map<String, Facet> facets;
    private ZonedDateTime updatedAt;

    public OutputDatasetFacetDocument() {
    }

    public OutputDatasetFacetDocument(MarquezId datasetId, Map<String, Facet> facets, ZonedDateTime updatedAt) {
        this.datasetId = datasetId;
        this.facets = facets;
        this.updatedAt = updatedAt;
    }

    public MarquezId getDatasetId() {
        return datasetId;
    }

    public void setDatasetId(MarquezId datasetId) {
        this.datasetId = datasetId;
    }

    public Map<String, Facet> getFacets() {
        return facets;
    }

    public void setFacets(Map<String, Facet> facets) {
        this.facets = facets;
    }

    public ZonedDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(ZonedDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
