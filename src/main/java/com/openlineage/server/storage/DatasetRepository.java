package com.openlineage.server.storage;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface DatasetRepository extends MongoRepository<DatasetDocument, MarquezId> {
    List<DatasetDocument> findByIdNamespace(String namespace);
}
