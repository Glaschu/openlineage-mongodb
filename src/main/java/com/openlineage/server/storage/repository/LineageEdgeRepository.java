package com.openlineage.server.storage.repository;

import com.openlineage.server.storage.document.LineageEdgeDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface LineageEdgeRepository extends MongoRepository<LineageEdgeDocument, String> {

    List<LineageEdgeDocument> findBySourceNamespaceAndSourceName(String namespace, String name);

    List<LineageEdgeDocument> findByTargetNamespaceAndTargetName(String namespace, String name);

    List<LineageEdgeDocument> findBySourceNamespaceAndSourceNameAndTargetNamespaceAndTargetName(
            String sourceNamespace, String sourceName, String targetNamespace, String targetName);
}
