package com.openlineage.server.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Configuration
public class MongoConfig {

    @Bean
    public MongoCustomConversions customConversions() {
        List<Converter<?, ?>> converters = new ArrayList<>();
        converters.add(new ZonedDateTimeToDateConverter());
        converters.add(new DateToZonedDateTimeConverter());
        // MarquezId is stored natively as a nested document {namespace, name}
        // — no string converters needed (the old ":" delimiter broke S3/JDBC URIs).
        converters.add(new DocumentToFacetMapConverter());
        return new MongoCustomConversions(converters);
    }

    @Bean
    @org.springframework.boot.autoconfigure.condition.ConditionalOnBean(org.springframework.data.mongodb.MongoDatabaseFactory.class)
    public org.springframework.data.mongodb.core.convert.MappingMongoConverter mappingMongoConverter(
            org.springframework.data.mongodb.MongoDatabaseFactory factory,
            org.springframework.data.mongodb.core.convert.MongoCustomConversions conversions,
            org.springframework.data.mongodb.core.mapping.MongoMappingContext context) {
        org.springframework.data.mongodb.core.convert.DbRefResolver dbRefResolver = new org.springframework.data.mongodb.core.convert.DefaultDbRefResolver(
                factory);
        org.springframework.data.mongodb.core.convert.MappingMongoConverter mappingConverter = new org.springframework.data.mongodb.core.convert.MappingMongoConverter(
                dbRefResolver, context);
        mappingConverter.setCustomConversions(conversions);
        mappingConverter.setMapKeyDotReplacement("_dot_");
        return mappingConverter;
    }

    static class ZonedDateTimeToDateConverter implements Converter<ZonedDateTime, Date> {
        @Override
        public Date convert(ZonedDateTime source) {
            return Date.from(source.toInstant());
        }
    }

    static class DateToZonedDateTimeConverter implements Converter<Date, ZonedDateTime> {
        @Override
        public ZonedDateTime convert(Date source) {
            return ZonedDateTime.ofInstant(source.toInstant(), ZoneId.of("UTC")); // Default to UTC
        }
    }

    @Bean
    public org.springframework.boot.autoconfigure.mongo.MongoClientSettingsBuilderCustomizer mongoClientSettingsBuilderCustomizer() {
        return builder -> {
            builder.uuidRepresentation(org.bson.UuidRepresentation.STANDARD);
            builder.retryWrites(false);
        };
    }
}
