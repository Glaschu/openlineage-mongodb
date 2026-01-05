package com.openlineage.server.storage;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface TagRepository extends MongoRepository<TagDocument, String> {
}
