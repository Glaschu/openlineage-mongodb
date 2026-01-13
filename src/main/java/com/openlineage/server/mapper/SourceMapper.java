package com.openlineage.server.mapper;

import com.openlineage.server.api.models.SourceResponse;
import com.openlineage.server.storage.document.DataSourceDocument;
import org.springframework.stereotype.Component;

@Component
public class SourceMapper {
    public SourceResponse toResponse(DataSourceDocument doc) {
        return new SourceResponse(
                doc.getType() != null ? doc.getType() : "CUSTOM",
                doc.getName(),
                doc.getCreatedAt(),
                doc.getUpdatedAt() != null ? doc.getUpdatedAt() : doc.getCreatedAt(),
                doc.getConnectionUrl(),
                doc.getDescription());
    }
}
