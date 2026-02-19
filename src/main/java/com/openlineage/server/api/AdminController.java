package com.openlineage.server.api;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v2/admin")
public class AdminController {

    private final MongoTemplate mongoTemplate;

    public AdminController(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @DeleteMapping("/database")
    public ResponseEntity<String> wipeDatabase() {
        mongoTemplate.getDb().drop();
        return ResponseEntity.ok("Database wiped successfully");
    }

    @org.springframework.web.bind.annotation.GetMapping("/collections/{collectionName}")
    public org.springframework.http.ResponseEntity<java.util.List<org.bson.Document>> getDocuments(
            @org.springframework.web.bind.annotation.PathVariable String collectionName,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "100") int limit) {
        
        java.util.List<org.bson.Document> documents = mongoTemplate.find(
                new org.springframework.data.mongodb.core.query.Query().limit(limit),
                org.bson.Document.class,
                collectionName
        );
        return org.springframework.http.ResponseEntity.ok(documents);
    }

    /**
     * Manual purge endpoint — deletes documents older than the specified date.
     * Targets: lineage_events, runs, input_dataset_input_facets, output_dataset_output_facets.
     */
    @org.springframework.web.bind.annotation.PostMapping("/purge")
    public ResponseEntity<java.util.Map<String, Object>> purgeOldData(
            @org.springframework.web.bind.annotation.RequestParam String olderThan) {

        java.time.ZonedDateTime cutoff = java.time.ZonedDateTime.parse(olderThan);
        java.util.Map<String, Object> results = new java.util.LinkedHashMap<>();

        String[] collections = {"lineage_events", "runs", "input_dataset_input_facets", "output_dataset_output_facets"};

        for (String collection : collections) {
            org.springframework.data.mongodb.core.query.Query query = org.springframework.data.mongodb.core.query.Query
                    .query(org.springframework.data.mongodb.core.query.Criteria.where("createdAt").lt(cutoff));
            com.mongodb.client.result.DeleteResult result = mongoTemplate.remove(query, collection);
            results.put(collection, result.getDeletedCount());
        }

        results.put("cutoffDate", cutoff.toString());
        return ResponseEntity.ok(results);
    }

    /**
     * Storage stats endpoint — returns document counts and sizes for all collections.
     */
    @org.springframework.web.bind.annotation.GetMapping("/stats")
    public ResponseEntity<java.util.Map<String, Object>> getStats() {
        java.util.Map<String, Object> stats = new java.util.LinkedHashMap<>();

        String[] collections = {"lineage_events", "runs", "jobs", "datasets",
                "input_dataset_input_facets", "output_dataset_output_facets",
                "lineage_edges", "namespace_registry"};

        for (String collection : collections) {
            long count = mongoTemplate.getCollection(collection).estimatedDocumentCount();
            stats.put(collection, count);
        }

        return ResponseEntity.ok(stats);
    }
}
