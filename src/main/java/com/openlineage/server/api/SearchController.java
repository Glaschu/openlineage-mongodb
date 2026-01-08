package com.openlineage.server.api;

import com.openlineage.server.api.models.SearchFilter;
import com.openlineage.server.api.models.SearchResult;
import com.openlineage.server.api.models.SearchSort;
import com.openlineage.server.storage.DatasetDocument;
import com.openlineage.server.storage.JobDocument;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/v1/search")
public class SearchController {

    private final MongoTemplate mongoTemplate;

    public SearchController(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public record SearchResponse(int totalCount, List<SearchResult> results) {
    }

    @GetMapping
    public SearchResponse search(
            @RequestParam("q") String query,
            @RequestParam(value = "filter", required = false) SearchFilter filter,
            @RequestParam(value = "sort", defaultValue = "NAME") SearchSort sort,
            @RequestParam(value = "limit", defaultValue = "10") int limit) {

        List<SearchResult> allResults = new ArrayList<>();

        // Create case-insensitive regex pattern
        String regex = "(?i).*" + query + ".*";

        if (filter == null || filter == SearchFilter.JOB) {
            Query jobQuery = new Query(Criteria.where("_id.name").regex(regex));
            // Apply similar limit logic at DB level if possible, but since we are combining
            // two collections,
            // we might over-fetch slightly then truncate. Ideally, we'd use a
            // union/aggregate but simplified for now.
            jobQuery.limit(limit);
            List<JobDocument> jobs = mongoTemplate.find(jobQuery, JobDocument.class);
            allResults.addAll(jobs.stream()
                    .map(j -> SearchResult.job(
                            j.getId().getName(),
                            j.getId().getNamespace(),
                            j.getUpdatedAt(),
                            j.getDescription()))
                    .toList());
        }

        if (filter == null || filter == SearchFilter.DATASET) {
            Query datasetQuery = new Query(Criteria.where("_id.name").regex(regex));
            datasetQuery.limit(limit);
            List<DatasetDocument> datasets = mongoTemplate.find(datasetQuery, DatasetDocument.class);
            allResults.addAll(datasets.stream()
                    .map(d -> SearchResult.dataset(
                            d.getId().getName(),
                            d.getId().getNamespace(),
                            d.getUpdatedAt(),
                            d.getDescription()))
                    .toList());
        }

        // Sort and Limit in memory (simplified approach for joined search)
        Comparator<SearchResult> comparator = switch (sort) {
            case UPDATE_AT -> Comparator.comparing(SearchResult::updatedAt).reversed();
            case NAME -> Comparator.comparing(SearchResult::name);
        };

        List<SearchResult> finalResults = allResults.stream()
                .sorted(comparator)
                .limit(limit)
                .collect(Collectors.toList());

        return new SearchResponse(finalResults.size(), finalResults);
    }
}
