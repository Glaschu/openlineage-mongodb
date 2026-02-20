package com.openlineage.server.storage.repository;

import com.openlineage.server.storage.document.*;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RunRepository extends MongoRepository<RunDocument, String> {
    org.springframework.data.domain.Slice<RunDocument> findByJobNamespaceAndJobName(String namespace, String name,
            org.springframework.data.domain.Pageable pageable);
}
