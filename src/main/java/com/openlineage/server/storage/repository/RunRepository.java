package com.openlineage.server.storage.repository;
import com.openlineage.server.storage.document.*;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RunRepository extends MongoRepository<RunDocument, String> {
    java.util.List<RunDocument> findByJobNamespaceAndJobNameOrderByEventTimeDesc(String namespace, String name);
}
