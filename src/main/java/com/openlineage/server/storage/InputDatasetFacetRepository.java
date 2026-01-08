package com.openlineage.server.storage;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InputDatasetFacetRepository extends MongoRepository<InputDatasetFacetDocument, MarquezId> {
}
