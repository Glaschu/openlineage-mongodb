package com.openlineage.server.api;

import com.fasterxml.jackson.annotation.JsonProperty;

import com.openlineage.server.storage.repository.JobRepository;
import com.openlineage.server.storage.repository.DatasetRepository;
import com.openlineage.server.storage.repository.NamespaceRepository;
import com.openlineage.server.storage.document.LineageEventDocument;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.data.mongodb.core.aggregation.DateOperators;
import org.bson.Document;
import java.util.HashMap;
import java.util.Collections;

@RestController
@RequestMapping("/api/v1/stats")
public class StatsController {

        private final MongoTemplate mongoTemplate;
        private final JobRepository jobRepository;
        private final DatasetRepository datasetRepository;
        private final NamespaceRepository namespaceRepository;

        public StatsController(MongoTemplate mongoTemplate, JobRepository jobRepository,
                        DatasetRepository datasetRepository, NamespaceRepository namespaceRepository) {
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
                        @JsonProperty("abort") int abort) {
        }

        public record IntervalMetric(
                        @JsonProperty("startInterval") String startInterval,
                        @JsonProperty("endInterval") String endInterval,
                        @JsonProperty("count") long count) {
        }

        @GetMapping("/lineage-events")
        public List<LineageMetric> getLineageEventStats(
                        @RequestParam(defaultValue = "DAY") String period,
                        @RequestParam(defaultValue = "UTC") String timezone) {

                ZonedDateTime now = ZonedDateTime.now(ZoneId.of(timezone));
                // Hardcoding DAY logic for now as requested
                ZonedDateTime startTime = now.minus(24, ChronoUnit.HOURS).truncatedTo(ChronoUnit.HOURS);
                ZonedDateTime endTime = now.truncatedTo(ChronoUnit.HOURS).plus(1, ChronoUnit.HOURS);

                Aggregation aggregation = Aggregation.newAggregation(
                                Aggregation.match(Criteria.where("event.eventTime").gte(startTime.toInstant())
                                                .lt(endTime.toInstant())),
                                Aggregation.project()
                                                .and(DateOperators.DateToString.dateOf("event.eventTime")
                                                                .toString("%Y-%m-%dT%H:00:00Z")
                                                                .withTimezone(DateOperators.Timezone.valueOf(timezone)))
                                                .as("hour")
                                                .and("event.eventType").as("type"),
                                Aggregation.group("hour", "type").count().as("count"));

                AggregationResults<Document> results = mongoTemplate.aggregate(aggregation, LineageEventDocument.class,
                                Document.class);

                // Map: Hour -> (Type -> Count)
                Map<String, Map<String, Integer>> data = new HashMap<>();
                for (Document doc : results.getMappedResults()) {
                        Document id = (Document) doc.get("_id");
                        String hour = id.getString("hour");
                        String type = id.getString("type").toUpperCase();
                        int count = doc.getInteger("count", 0);
                        data.computeIfAbsent(hour, k -> new HashMap<>()).put(type, count);
                }

                List<LineageMetric> metrics = new ArrayList<>();
                ZonedDateTime current = startTime;
                while (current.isBefore(endTime)) {

                        // Ideally we use same formatter as projection.
                        String dbKey = current.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:00:00'Z'"));

                        final ZonedDateTime end = current.plus(1, ChronoUnit.HOURS);

                        Map<String, Integer> counts = data.getOrDefault(dbKey, Collections.emptyMap());

                        int fail = counts.getOrDefault("FAIL", 0) + counts.getOrDefault("FAILED", 0);
                        int startCount = counts.getOrDefault("START", 0);
                        int complete = counts.getOrDefault("COMPLETE", 0) + counts.getOrDefault("COMPLETED", 0);
                        int abort = counts.getOrDefault("ABORT", 0) + counts.getOrDefault("ABORTED", 0);

                        metrics.add(new LineageMetric(
                                        current.format(DateTimeFormatter.ISO_INSTANT),
                                        end.format(DateTimeFormatter.ISO_INSTANT),
                                        fail, startCount, complete, abort));

                        current = current.plus(1, ChronoUnit.HOURS);
                }
                return metrics;
        }

        @GetMapping("/jobs")
        public List<IntervalMetric> getJobStats(
                        @RequestParam(defaultValue = "DAY") String period,
                        @RequestParam(defaultValue = "UTC") String timezone) {
                return getCumulativeStats(period, timezone, "jobs", jobRepository.count());
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

                long baseCount = mongoTemplate.count(
                                org.springframework.data.mongodb.core.query.Query.query(
                                                Criteria.where("createdAt").lt(startTime.toInstant())),
                                getCollectionClass(collectionName));

                Aggregation aggregation = Aggregation.newAggregation(
                                Aggregation.match(Criteria.where("createdAt").gte(startTime.toInstant())
                                                .lt(endTime.toInstant())),
                                Aggregation.project()
                                                .and(DateOperators.DateToString.dateOf("createdAt")
                                                                .toString("%Y-%m-%dT%H:00:00Z")
                                                                .withTimezone(DateOperators.Timezone.valueOf(timezone)))
                                                .as("hour"),
                                Aggregation.group("hour").count().as("count"));
                AggregationResults<Document> results = mongoTemplate.aggregate(aggregation,
                                getCollectionClass(collectionName),
                                Document.class);

                Map<String, Long> counts = new HashMap<>();
                for (Document doc : results.getMappedResults()) {
                        Object countObj = doc.get("count");
                        long countVal = 0;
                        if (countObj instanceof Number) {
                                countVal = ((Number) countObj).longValue();
                        }
                        counts.put(doc.getString("_id"), countVal);
                }

                while (current.isBefore(endTime)) {
                        ZonedDateTime next = current.plus(1, ChronoUnit.HOURS);
                        String key = current.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:00:00'Z'"));

                        long countInHour = counts.getOrDefault(key, 0L);
                        baseCount += countInHour;

                        metrics.add(new IntervalMetric(
                                        current.format(DateTimeFormatter.ISO_INSTANT),
                                        next.format(DateTimeFormatter.ISO_INSTANT),
                                        baseCount));
                        current = next;
                }

                return metrics;
        }

        private Class<?> getCollectionClass(String name) {
                return switch (name) {
                        case "jobs" -> com.openlineage.server.storage.document.JobDocument.class;
                        case "datasets" -> com.openlineage.server.storage.document.DatasetDocument.class;
                        case "sources" -> com.openlineage.server.storage.document.NamespaceRegistryDocument.class;
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
