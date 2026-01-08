package com.openlineage.server.storage.repository;
import com.openlineage.server.storage.document.*;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InputDatasetFacetRepository extends MongoRepository<InputDatasetFacetDocument, MarquezId> {
}
