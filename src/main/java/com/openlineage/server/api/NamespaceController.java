package com.openlineage.server.api;

import com.openlineage.server.storage.document.NamespaceRegistryDocument;
import com.openlineage.server.storage.repository.NamespaceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v2/namespaces")
public class NamespaceController {

    private final NamespaceRepository repository;
    private final com.openlineage.server.mapper.NamespaceMapper namespaceMapper;

    public NamespaceController(NamespaceRepository repository,
            com.openlineage.server.mapper.NamespaceMapper namespaceMapper) {
        this.repository = repository;
        this.namespaceMapper = namespaceMapper;
    }

    @GetMapping
    public com.openlineage.server.api.models.NamespaceResponse.NamespacesResponse listNamespaces() {
        List<com.openlineage.server.api.models.NamespaceResponse> namespaces = repository.findAll().stream()
                .map(namespaceMapper::toResponse)
                .collect(java.util.stream.Collectors.toList());
        return new com.openlineage.server.api.models.NamespaceResponse.NamespacesResponse(namespaces);
    }

    @GetMapping("/{namespace}")
    public com.openlineage.server.api.models.NamespaceResponse getNamespace(@PathVariable String namespace) {
        return repository.findById(namespace)
                .map(namespaceMapper::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Namespace not found"));
    }

    @PutMapping("/{namespace}")
    public com.openlineage.server.api.models.NamespaceResponse updateNamespace(@PathVariable String namespace,
            @RequestBody NamespaceRegistryDocument doc) {
        // Ensure ID matches path
        doc.setNamespace(namespace);
        // Preserve creation time if exists
        repository.findById(namespace).ifPresent(existing -> doc.setCreatedAt(existing.getCreatedAt()));
        if (doc.getCreatedAt() == null)
            doc.setCreatedAt(java.time.ZonedDateTime.now());
        doc.setUpdatedAt(java.time.ZonedDateTime.now());

        return namespaceMapper.toResponse(repository.save(doc));
    }

    @DeleteMapping("/{namespace}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteNamespace(@PathVariable String namespace) {
        if (!repository.existsById(namespace)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Namespace not found");
        }
        repository.deleteById(namespace);
    }
}
