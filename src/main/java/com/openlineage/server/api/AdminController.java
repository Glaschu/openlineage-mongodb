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
}
