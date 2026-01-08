package com.openlineage.server.storage.repository;
import com.openlineage.server.storage.document.*;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OutputDatasetFacetRepository extends MongoRepository<OutputDatasetFacetDocument, MarquezId> {
}
