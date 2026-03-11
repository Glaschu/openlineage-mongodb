package com.openlineage.server.storage.repository;

import com.openlineage.server.storage.document.AlationDatasetMappingDocument;
import com.openlineage.server.storage.document.MappingStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlationMappingRepository extends MongoRepository<AlationDatasetMappingDocument, String> {
    List<AlationDatasetMappingDocument> findByOpenLineageNamespace(String openLineageNamespace);

    List<AlationDatasetMappingDocument> findByStatus(MappingStatus status);

    List<AlationDatasetMappingDocument> findByOpenLineageNamespaceAndStatus(String openLineageNamespace,
            MappingStatus status);
}
