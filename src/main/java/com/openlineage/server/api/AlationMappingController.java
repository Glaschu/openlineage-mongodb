package com.openlineage.server.api;

import com.openlineage.server.service.AlationMappingService;
import com.openlineage.server.storage.document.AlationDatasetMappingDocument;
import com.openlineage.server.storage.document.MappingStatus;
import com.openlineage.server.storage.repository.AlationMappingRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v2/alation-mappings")
public class AlationMappingController {

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
        mappingService.suggestMappingsForSchema(namespace, schemaId);
        return ResponseEntity.accepted().build();
    }

    @GetMapping
    public ResponseEntity<List<AlationDatasetMappingDocument>> getMappings(
            @RequestParam(required = false) String namespace,
            @RequestParam(required = false) MappingStatus status) {

        List<AlationDatasetMappingDocument> mappings;
        if (namespace != null) {
            mappings = mappingRepository.findByOpenLineageNamespace(namespace);
            if (status != null) {
                mappings = mappings.stream().filter(m -> m.getStatus() == status).toList();
            }
        } else {
            mappings = mappingRepository.findAll();
            if (status != null) {
                mappings = mappings.stream().filter(m -> m.getStatus() == status).toList();
            }
        }

        return ResponseEntity.ok(mappings);
    }

    @PutMapping("/{id}/accept")
    public ResponseEntity<AlationDatasetMappingDocument> acceptMapping(@PathVariable String id) {
        Optional<AlationDatasetMappingDocument> docOpt = mappingRepository.findById(id);
        if (docOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        AlationDatasetMappingDocument doc = docOpt.get();
        doc.setStatus(MappingStatus.ACCEPTED);
        doc.setUpdatedAt(Instant.now());
        mappingRepository.save(doc);

        return ResponseEntity.ok(doc);
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<AlationDatasetMappingDocument> rejectMapping(@PathVariable String id) {
        Optional<AlationDatasetMappingDocument> docOpt = mappingRepository.findById(id);
        if (docOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        AlationDatasetMappingDocument doc = docOpt.get();
        doc.setStatus(MappingStatus.REJECTED);
        doc.setUpdatedAt(Instant.now());
        mappingRepository.save(doc);

        return ResponseEntity.ok(doc);
    }
}
