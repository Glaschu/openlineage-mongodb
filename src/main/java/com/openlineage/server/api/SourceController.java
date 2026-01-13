package com.openlineage.server.api;

import com.openlineage.server.api.models.SourceResponse;
import com.openlineage.server.mapper.SourceMapper;
import com.openlineage.server.storage.document.DataSourceDocument;
import com.openlineage.server.storage.repository.DataSourceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/sources")
public class SourceController {

    private final DataSourceRepository repository;
    private final SourceMapper mapper;

    public SourceController(DataSourceRepository repository, SourceMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @GetMapping
    public SourceResponse.SourcesResponse listSources() {
        List<SourceResponse> sources = repository.findAll().stream()
                .map(mapper::toResponse)
                .collect(Collectors.toList());
        return new SourceResponse.SourcesResponse(sources);
    }

    @GetMapping("/{sourceName}")
    public SourceResponse getSource(@PathVariable String sourceName) {
        return repository.findById(sourceName)
                .map(mapper::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Source not found"));
    }

    @PutMapping("/{sourceName}")
    public SourceResponse createOrUpdate(@PathVariable String sourceName, @RequestBody DataSourceDocument doc) {
        // Basic implementation to support the endpoint.
        // In verify step we'll see if the request body matches DataSourceDocument
        // structure or needs a separate request model.
        // Legacy 'SourceMeta' had type, connectionUrl, description.
        // We'll map what we can.

        doc.setName(sourceName);
        if (doc.getCreatedAt() == null) {
            repository.findById(sourceName).ifPresent(existing -> doc.setCreatedAt(existing.getCreatedAt()));
        }
        if (doc.getCreatedAt() == null) {
            doc.setCreatedAt(ZonedDateTime.now());
        }

        return mapper.toResponse(repository.save(doc));
    }
}
