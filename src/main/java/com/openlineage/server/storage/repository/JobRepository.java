package com.openlineage.server.storage.repository;

import com.openlineage.server.storage.document.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface JobRepository extends MongoRepository<JobDocument, MarquezId> {
    Page<JobDocument> findByIdNamespace(String namespace, Pageable pageable);

    List<JobDocument> findByInputsContaining(MarquezId id);

    List<JobDocument> findByOutputsContaining(MarquezId id);

    Page<JobDocument> findByParentJobNameIsNull(Pageable pageable);

    Page<JobDocument> findByParentJobName(String parentJobName, Pageable pageable);

    Page<JobDocument> findByIdNamespaceAndParentJobNameIsNull(String namespace, Pageable pageable);

    Page<JobDocument> findByIdNamespaceAndParentJobName(String namespace, String parentJobName, Pageable pageable);
}
