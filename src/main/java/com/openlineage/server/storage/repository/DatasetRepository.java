package com.openlineage.server.storage.repository;
import com.openlineage.server.storage.document.*;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface DatasetRepository extends MongoRepository<DatasetDocument, MarquezId> {
    @org.springframework.data.mongodb.repository.Query("{ '_id': { $regex: '^?0:' } }")
    List<DatasetDocument> findByIdNamespace(String namespace);
}
