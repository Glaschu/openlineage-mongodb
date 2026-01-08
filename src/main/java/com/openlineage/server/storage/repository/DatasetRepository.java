package com.openlineage.server.storage.repository;
import com.openlineage.server.storage.document.*;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface DatasetRepository extends MongoRepository<DatasetDocument, MarquezId> {
    List<DatasetDocument> findByIdNamespace(String namespace);
}
