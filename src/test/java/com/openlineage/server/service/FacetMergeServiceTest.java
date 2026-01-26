package com.openlineage.server.service;

import com.openlineage.server.domain.Facet;
import com.openlineage.server.storage.document.InputDatasetFacetDocument;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class FacetMergeServiceTest {

    @Mock
    private MongoTemplate mongoTemplate;

    @InjectMocks
    private FacetMergeService facetMergeService;

    @Test
    void shouldReplaceDotsInFacetKeys() {
        String namespace = "ns";
        String name = "ds";
        String facetKey = "io.openlineage.schema";
        Facet facetValue = new Facet() {}; // Anonymous subclass or mock
        Map<String, Facet> facets = Collections.singletonMap(facetKey, facetValue);
        ZonedDateTime now = ZonedDateTime.now();

        facetMergeService.mergeInputFacets(namespace, name, facets, now);

        ArgumentCaptor<Update> updateCaptor = ArgumentCaptor.forClass(Update.class);
        verify(mongoTemplate).upsert(
                org.mockito.ArgumentMatchers.any(Query.class),
                updateCaptor.capture(),
                eq(InputDatasetFacetDocument.class)
        );

        Update update = updateCaptor.getValue();
        // Check if the key in the update is "facets.io_dot_openlineage_dot_schema"
        // The Update object stores modifiers in a map. We can inspect its string representation or internal state if accessible,
        // but typically `getUpdateObject()` returns the BSON representation.
        // For simplicity in this unit test without embedded mongo, we can check the toString() or inspect via reflection if needed,
        // but `Update` exposes `getUpdateObject()`.
        
        // Let's rely on the side effect that `set` was called with the correct key.
        // Since we can't easily inspect the private map of modifiers in a plain `Update` object without casting to Document,
        // we can verify the key construction logic by ensuring the map contains the transformed key.
        
        org.bson.Document updateDoc = update.getUpdateObject();
        org.bson.Document setClause = (org.bson.Document) updateDoc.get("$set");
        
        assertThat(setClause).containsKey("facets.io_dot_openlineage_dot_schema");
        assertThat(setClause).doesNotContainKey("facets.io.openlineage.schema");
    }
}
