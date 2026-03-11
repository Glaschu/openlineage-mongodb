package com.openlineage.server.api;

import com.openlineage.server.service.AlationMappingService;
import com.openlineage.server.storage.document.AlationDatasetMappingDocument;
import com.openlineage.server.storage.document.MappingStatus;
import com.openlineage.server.storage.repository.AlationMappingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v2/alation-mappings")
public class AlationMappingController {

    private static final Logger log = LoggerFactory.getLogger(AlationMappingController.class);

    private final AlationMappingService mappingService;
    private final AlationMappingRepository mappingRepository;

    public AlationMappingController(AlationMappingService mappingService,
            AlationMappingRepository mappingRepository) {
        this.mappingService = mappingService;
        this.mappingRepository = mappingRepository;
    }

    @PostMapping("/suggest")
    public ResponseEntity<Void> suggestMappings(@RequestParam String namespace,
            @RequestParam Long schemaId) {
        log.info("Triggering mapping suggestions for namespace='{}', schemaId={}", namespace, schemaId);
        try {
            mappingService.suggestMappingsForSchema(namespace, schemaId);
            return ResponseEntity.accepted().build();
        } catch (Exception e) {
            log.error("Failed to suggest mappings for namespace='{}', schemaId={}", namespace, schemaId, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping
    public ResponseEntity<List<AlationDatasetMappingDocument>> getMappings(
            @RequestParam(required = false) String namespace,
            @RequestParam(required = false) MappingStatus status) {

        List<AlationDatasetMappingDocument> mappings;
        if (namespace != null && status != null) {
            mappings = mappingRepository.findByOpenLineageNamespaceAndStatus(namespace, status);
        } else if (namespace != null) {
            mappings = mappingRepository.findByOpenLineageNamespace(namespace);
        } else if (status != null) {
            mappings = mappingRepository.findByStatus(status);
        } else {
            mappings = mappingRepository.findAll();
        }

        return ResponseEntity.ok(mappings);
    }

    @PutMapping("/{id}/accept")
    public ResponseEntity<AlationDatasetMappingDocument> acceptMapping(@PathVariable String id) {
        Optional<AlationDatasetMappingDocument> docOpt = mappingRepository.findById(id);
        if (docOpt.isEmpty()) {
            log.warn("Mapping not found for accept: id='{}'", id);
            return ResponseEntity.notFound().build();
        }

        AlationDatasetMappingDocument doc = docOpt.get();
        doc.setStatus(MappingStatus.ACCEPTED);
        doc.setUpdatedAt(Instant.now());
        mappingRepository.save(doc);

        log.info("Mapping accepted: id='{}', dataset='{}'", id, doc.getAlationDatasetName());
        return ResponseEntity.ok(doc);
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<AlationDatasetMappingDocument> rejectMapping(@PathVariable String id) {
        Optional<AlationDatasetMappingDocument> docOpt = mappingRepository.findById(id);
        if (docOpt.isEmpty()) {
            log.warn("Mapping not found for reject: id='{}'", id);
            return ResponseEntity.notFound().build();
        }

        AlationDatasetMappingDocument doc = docOpt.get();
        doc.setStatus(MappingStatus.REJECTED);
        doc.setUpdatedAt(Instant.now());
        mappingRepository.save(doc);

        log.info("Mapping rejected: id='{}', dataset='{}'", id, doc.getAlationDatasetName());
        return ResponseEntity.ok(doc);
    }
}
