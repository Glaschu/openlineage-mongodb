package com.openlineage.server.config;

import com.openlineage.server.domain.*;
import com.openlineage.server.storage.document.DocumentDbSanitizer;
import org.bson.Document;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;

import java.util.HashMap;

import java.util.Map;

/**
 * Custom MongoDB read converter that converts a BSON Document representing
 * a Map&lt;String, Facet&gt; back into the correct Facet implementations.
 *
 * Without this converter, Spring Data tries to instantiate the Facet interface
 * directly (NO_CONSTRUCTOR error) because it doesn't know which concrete class
 * to use.
 *
 * This mirrors the logic in {@link OpenLineageFacetsDeserializer} but operates
 * on BSON Documents coming from MongoDB/DocumentDB rather than JSON.
 */
@ReadingConverter
public class DocumentToFacetMapConverter implements Converter<Document, Map<String, Facet>> {

    // Well-known facet keys mapped to typed classes — mirrors
    // OpenLineageFacetsDeserializer
    private static final Map<String, Class<? extends Facet>> TYPED_FACETS = Map.ofEntries(
            Map.entry("schema", SchemaDatasetFacet.class),
            Map.entry("ownership", OwnershipDatasetFacet.class),
            Map.entry("columnLineage", ColumnLineageDatasetFacet.class),
            Map.entry("documentation", DocumentationFacet.class),
            Map.entry("dataSource", DataSourceDatasetFacet.class),
            Map.entry("storage", StorageDatasetFacet.class),
            Map.entry("lifecycleStateChange", LifecycleStateChangeDatasetFacet.class),
            Map.entry("symlinks", SymlinksDatasetFacet.class),
            Map.entry("sql", SqlJobFacet.class),
            Map.entry("sourceCodeLocation", SourceCodeLocationJobFacet.class));

    private static final com.fasterxml.jackson.databind.ObjectMapper MAPPER = new com.fasterxml.jackson.databind.ObjectMapper()
            .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule())
            .disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    @Override
    public Map<String, Facet> convert(Document source) {
        Map<String, Facet> result = new HashMap<>();

        for (Map.Entry<String, Object> entry : source.entrySet()) {
            String key = entry.getKey();

            // Skip MongoDB internal fields
            if ("_class".equals(key))
                continue;

            // Unsanitize the key (restore dots/dollars from _dot_/_dollar_)
            String originalKey = DocumentDbSanitizer.unsanitizeKey(key);

            Object value = entry.getValue();
            Facet facet = convertToFacet(originalKey, value);
            result.put(originalKey, facet);
        }

        return result;
    }

    private Facet convertToFacet(String key, Object value) {
        if (value == null) {
            return new GenericFacet();
        }

        // Unsanitize the value (restore dotted keys inside nested maps)
        Object unsanitized = DocumentDbSanitizer.unsanitize(value);

        Class<? extends Facet> typedClass = TYPED_FACETS.get(key);

        try {
            if (typedClass != null) {
                return MAPPER.convertValue(unsanitized, typedClass);
            }
        } catch (IllegalArgumentException e) {
            // Fall through to GenericFacet
        }

        // Default: GenericFacet preserves all data as a map
        GenericFacet generic = new GenericFacet();
        if (unsanitized instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> map = (Map<String, Object>) unsanitized;
            map.forEach(generic::setAdditionalProperty);
        } else {
            generic.setAdditionalProperty("value", unsanitized);
        }
        return generic;
    }
}
