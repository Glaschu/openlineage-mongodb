package com.openlineage.server.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.openlineage.server.api.models.TagResponse;
import com.openlineage.server.storage.document.TagDocument;
import com.openlineage.server.storage.repository.TagRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v2/tags")
public class TagController {

    private final TagRepository tagRepository;
    private final com.openlineage.server.mapper.TagMapper tagMapper;

    public TagController(TagRepository tagRepository, com.openlineage.server.mapper.TagMapper tagMapper) {
        this.tagRepository = tagRepository;
        this.tagMapper = tagMapper;
    }

    @GetMapping
    public ResponseEntity<TagsResponse> listTags() {
        List<TagDocument> tags = tagRepository.findAll();
        Set<TagResponse> tagResponses = tags.stream()
                .map(tagMapper::toResponse)
                .collect(Collectors.toSet());
        return ResponseEntity.ok(new TagsResponse(tagResponses));
    }

    @PutMapping("/{tag}")
    public ResponseEntity<TagResponse> createTag(
            @PathVariable("tag") String tagName,
            @RequestBody TagDescription description) {
        TagDocument tag = tagRepository.findById(tagName)
                .orElse(new TagDocument(tagName, description.description(), ZonedDateTime.now()));

        if (description.description() != null) {
            tag.setDescription(description.description());
            tag.setUpdatedAt(ZonedDateTime.now());
        }

        tagRepository.save(tag);
        return ResponseEntity.ok(tagMapper.toResponse(tag));
    }

    public record TagsResponse(@JsonProperty("tags") Set<TagResponse> tags) {
    }

    public record TagDescription(@JsonProperty("description") String description) {
    }
}
