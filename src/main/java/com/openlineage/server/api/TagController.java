package com.openlineage.server.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.openlineage.server.api.models.TagResponse;
import com.openlineage.server.storage.TagDocument;
import com.openlineage.server.storage.TagRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/tags")
public class TagController {

    private final TagRepository tagRepository;

    public TagController(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    @GetMapping
    public ResponseEntity<TagsResponse> listTags() {
        List<TagDocument> tags = tagRepository.findAll();
        Set<TagResponse> tagResponses = tags.stream()
            .map(t -> new TagResponse(t.getName(), t.getDescription()))
            .collect(Collectors.toSet());
        return ResponseEntity.ok(new TagsResponse(tagResponses));
    }

    @PutMapping("/{tag}")
    public ResponseEntity<TagResponse> createTag(
        @PathVariable("tag") String tagName,
        @RequestBody TagDescription description
    ) {
        TagDocument tag = tagRepository.findById(tagName)
            .orElse(new TagDocument(tagName, description.description(), ZonedDateTime.now()));
        
        if (description.description() != null) {
            tag.setDescription(description.description());
            tag.setUpdatedAt(ZonedDateTime.now());
        }
        
        tagRepository.save(tag);
        return ResponseEntity.ok(new TagResponse(tag.getName(), tag.getDescription()));
    }

    public record TagsResponse(@JsonProperty("tags") Set<TagResponse> tags) {}
    public record TagDescription(@JsonProperty("description") String description) {}
}
