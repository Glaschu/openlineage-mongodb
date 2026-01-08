package com.openlineage.server.mapper;

import com.openlineage.server.api.models.SearchResult;
import com.openlineage.server.storage.document.DatasetDocument;
import com.openlineage.server.storage.document.JobDocument;
import org.springframework.stereotype.Component;

@Component
public class SearchMapper {

    public SearchResult toSearchResult(JobDocument j) {
        return SearchResult.job(
                j.getId().getName(),
                j.getId().getNamespace(),
                j.getUpdatedAt(),
                j.getDescription());
    }

    public SearchResult toSearchResult(DatasetDocument d) {
        return SearchResult.dataset(
                d.getId().getName(),
                d.getId().getNamespace(),
                d.getUpdatedAt(),
                d.getDescription());
    }
}
