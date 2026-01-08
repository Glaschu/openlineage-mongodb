package com.openlineage.server.storage.repository;
import com.openlineage.server.storage.document.*;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface JobRepository extends MongoRepository<JobDocument, MarquezId> {
    List<JobDocument> findByIdNamespace(String namespace);
    List<JobDocument> findByInputsContaining(MarquezId id);
    List<JobDocument> findByOutputsContaining(MarquezId id);
}
