package com.openlineage.server.storage;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OutputDatasetFacetRepository extends MongoRepository<OutputDatasetFacetDocument, MarquezId> {
}
