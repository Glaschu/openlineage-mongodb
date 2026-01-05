package com.openlineage.server.storage;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface LineageEventRepository extends MongoRepository<LineageEventDocument, String> {
    @org.springframework.data.mongodb.repository.Query("{ 'event.run.runId': ?0 }")
    List<LineageEventDocument> findByRunId(String runId);

    // Keep original for compatibility if needed, but we will switch to findByRunId
    List<LineageEventDocument> findByEventRunRunId(String runId);
    
    List<LineageEventDocument> findByEventJobNamespaceAndEventJobName(String namespace, String name);

    org.springframework.data.domain.Page<LineageEventDocument> findByEventOutputsNamespaceAndEventOutputsName(String namespace, String name, org.springframework.data.domain.Pageable pageable);
    
    org.springframework.data.domain.Page<LineageEventDocument> findByEventEventTimeBetween(java.time.ZonedDateTime start, java.time.ZonedDateTime end, org.springframework.data.domain.Pageable pageable);
}
