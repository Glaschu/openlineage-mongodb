package com.openlineage.server.storage.repository;
import com.openlineage.server.storage.document.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface JobRepository extends MongoRepository<JobDocument, MarquezId> {
    @org.springframework.data.mongodb.repository.Query("{ '_id': { $regex: '^?0:' } }")
    Page<JobDocument> findByIdNamespace(String namespace, Pageable pageable);
    List<JobDocument> findByInputsContaining(MarquezId id);
    List<JobDocument> findByOutputsContaining(MarquezId id);
}
