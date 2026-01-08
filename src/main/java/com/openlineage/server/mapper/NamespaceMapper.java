package com.openlineage.server.mapper;

import com.openlineage.server.api.models.NamespaceResponse;
import com.openlineage.server.storage.document.NamespaceRegistryDocument;
import org.springframework.stereotype.Component;

import java.time.ZonedDateTime;

@Component
public class NamespaceMapper {
    public NamespaceResponse toResponse(NamespaceRegistryDocument doc) {
        return new NamespaceResponse(
                doc.getNamespace(),
                doc.getCreatedAt() != null ? doc.getCreatedAt() : ZonedDateTime.now(),
                doc.getUpdatedAt() != null ? doc.getUpdatedAt() : ZonedDateTime.now(),
                doc.getOwnerTeam(),
                doc.getDescription(),
                false // isHidden default
        );
    }
}
