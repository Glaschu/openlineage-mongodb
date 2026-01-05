package com.openlineage.server.storage;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface NamespaceRepository extends MongoRepository<NamespaceRegistryDocument, String> {
}
