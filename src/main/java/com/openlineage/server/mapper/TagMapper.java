package com.openlineage.server.mapper;

import com.openlineage.server.api.models.TagResponse;
import com.openlineage.server.storage.document.TagDocument;
import org.springframework.stereotype.Component;

@Component
public class TagMapper {
    public TagResponse toResponse(TagDocument doc) {
        return new TagResponse(doc.getName(), doc.getDescription());
    }
}
