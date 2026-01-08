package com.openlineage.server.storage.repository;
import com.openlineage.server.storage.document.*;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface NamespaceRepository extends MongoRepository<NamespaceRegistryDocument, String> {
}
