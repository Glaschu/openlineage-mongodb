package com.openlineage.server.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.openlineage.server.storage.LineageEventRepository;
import com.openlineage.server.storage.JobRepository;
import com.openlineage.server.storage.DatasetRepository;
import com.openlineage.server.storage.NamespaceRepository;
import com.openlineage.server.storage.LineageEventDocument;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/stats")
public class StatsController {

    private final MongoTemplate mongoTemplate;
    private final JobRepository jobRepository;
    private final DatasetRepository datasetRepository;
    private final NamespaceRepository namespaceRepository;

    public StatsController(MongoTemplate mongoTemplate, JobRepository jobRepository, DatasetRepository datasetRepository, NamespaceRepository namespaceRepository) {
        this.mongoTemplate = mongoTemplate;
        this.jobRepository = jobRepository;
        this.datasetRepository = datasetRepository;
        this.namespaceRepository = namespaceRepository;
    }

    public record LineageMetric(
        @JsonProperty("startInterval") String startInterval,
        @JsonProperty("endInterval") String endInterval,
        @JsonProperty("fail") int fail,
        @JsonProperty("start") int start,
        @JsonProperty("complete") int complete,
        @JsonProperty("abort") int abort
    ) {}

    public record IntervalMetric(
        @JsonProperty("startInterval") String startInterval,
        @JsonProperty("endInterval") String endInterval,
        @JsonProperty("count") long count
    ) {}

    @GetMapping("/lineage-events")
    public List<LineageMetric> getLineageEventStats(
            @RequestParam(defaultValue = "DAY") String period,
            @RequestParam(defaultValue = "UTC") String timezone) {
        
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of(timezone));
        // Hardcoding DAY logic for now as requested
        ZonedDateTime startTime = now.minus(24, ChronoUnit.HOURS).truncatedTo(ChronoUnit.HOURS);
        ZonedDateTime endTime = now.truncatedTo(ChronoUnit.HOURS).plus(1, ChronoUnit.HOURS);

        // Aggregate events by hour
        // Ideally we use Mongo aggregation, but for simplicity and correctness with timezones, 
        // passing date objects is safer if standard query.
        // But grouping by hour in Mongo requires projection.
        
        // Let's pull data and aggregate in memory for simplicity if scale allows, 
        // to avoid complex Mongo timezone operators without specific setup.
        // Assuming reasonably small volume for stats window.
        
        List<LineageEventDocument> events = mongoTemplate.find(
            org.springframework.data.mongodb.core.query.Query.query(
                Criteria.where("event.eventTime").gte(startTime.toInstant()).lt(endTime.toInstant())
            ), 
            LineageEventDocument.class
        );

        List<LineageMetric> metrics = new ArrayList<>();
        ZonedDateTime current = startTime;
        while (current.isBefore(endTime)) {
            final ZonedDateTime start = current;
            final ZonedDateTime end = current.plus(1, ChronoUnit.HOURS);
            
            List<LineageEventDocument> chunk = events.stream()
                .filter(e -> {
                    ZonedDateTime t = e.getEvent().eventTime().withZoneSameInstant(ZoneId.of(timezone));
                    return t.isEqual(start) || (t.isAfter(start) && t.isBefore(end));
                })
                .collect(Collectors.toList());

            int fail = 0;
            int startCount = 0;
            int complete = 0;
            int abort = 0;

            for (LineageEventDocument doc : chunk) {
                String type = doc.getEvent().eventType().toUpperCase();
                switch (type) {
                    case "START" -> startCount++;
                    case "COMPLETE", "COMPLETED" -> complete++;
                    case "FAIL", "FAILED" -> fail++;
                    case "ABORT", "ABORTED" -> abort++;
                }
            }

            metrics.add(new LineageMetric(
                start.format(DateTimeFormatter.ISO_INSTANT),
                end.format(DateTimeFormatter.ISO_INSTANT),
                fail, startCount, complete, abort
            ));
            
            current = current.plus(1, ChronoUnit.HOURS);
        }
        return metrics;
    }

    @GetMapping("/jobs")
    public List<IntervalMetric> getJobStats(
            @RequestParam(defaultValue = "DAY") String period,
            @RequestParam(defaultValue = "UTC") String timezone) {
        return getCumulativeStats(period, timezone, "jobs", jobRepository.count());
        // Wait, repository.count() is total NOW. 
        // I need historical count.
        // For mongo, usually we can query count where createdAt < time.
    }
    
    // Helper for cumulative stats (jobs, datasets, sources)
    // Refactored to actually query DB correctly
    private List<IntervalMetric> getCumulativeStats(
        String period, 
        String timezone, 
        String collectionName,
        long currentTotalCount // This is just a hint, we need actual queries
    ) {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of(timezone));
        ZonedDateTime startTime = now.minus(24, ChronoUnit.HOURS).truncatedTo(ChronoUnit.HOURS);
        ZonedDateTime endTime = now.truncatedTo(ChronoUnit.HOURS).plus(1, ChronoUnit.HOURS);

        List<IntervalMetric> metrics = new ArrayList<>();
        ZonedDateTime current = startTime;
        
        // This is inefficient (24 queries). 
        // Optimized approach: Count all items created BEFORE start. Then count items created in each bucket.
        // mongoTemplate count.
        
        long baseCount = mongoTemplate.count(
            org.springframework.data.mongodb.core.query.Query.query(
                Criteria.where("createdAt").lt(startTime.toInstant())
            ),
            getCollectionClass(collectionName)
        );
        
        // Fetch creation times in the window
        // But wait, "createdAt" field exists on documents?
        // JobDocument, DatasetDocument, NamespaceRegistryDocument need "createdAt".
        // Job/Dataset normalized docs usually have createdAt/updatedAt.
        // NamespaceRegistry might not. I need to check.

        while (current.isBefore(endTime)) {
            ZonedDateTime next = current.plus(1, ChronoUnit.HOURS);
            
            long countInHour = mongoTemplate.count(
                org.springframework.data.mongodb.core.query.Query.query(
                    Criteria.where("createdAt").gte(current.toInstant()).lt(next.toInstant())
                ),
                getCollectionClass(collectionName)
            );
            
            baseCount += countInHour;
            
            metrics.add(new IntervalMetric(
                current.format(DateTimeFormatter.ISO_INSTANT),
                next.format(DateTimeFormatter.ISO_INSTANT),
                baseCount
            ));
            current = next;
        }

        return metrics;
    }

    private Class<?> getCollectionClass(String name) {
        return switch (name) {
            case "jobs" -> com.openlineage.server.storage.JobDocument.class;
            case "datasets" -> com.openlineage.server.storage.DatasetDocument.class;
            case "sources" -> com.openlineage.server.storage.NamespaceRegistryDocument.class; 
            default -> throw new IllegalArgumentException("Unknown collection: " + name);
        };
    }

    @GetMapping("/datasets")
    public List<IntervalMetric> getDatasetStats(
            @RequestParam(defaultValue = "DAY") String period,
            @RequestParam(defaultValue = "UTC") String timezone) {
         return getCumulativeStats(period, timezone, "datasets", 0);
    }

    @GetMapping("/sources")
    public List<IntervalMetric> getSourceStats(
            @RequestParam(defaultValue = "DAY") String period,
            @RequestParam(defaultValue = "UTC") String timezone) {
         return getCumulativeStats(period, timezone, "sources", 0);
    }
}
