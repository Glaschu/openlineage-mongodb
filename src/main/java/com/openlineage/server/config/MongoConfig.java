package com.openlineage.server.config;

import com.mongodb.MongoCredential;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.mongo.MongoProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Configuration
public class MongoConfig {

    private static final Logger log = LoggerFactory.getLogger(MongoConfig.class);

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

    /**
     * Customizes the MongoDB client settings.
     *
     * <p>When {@code spring.data.mongodb.iam-auth=true} (or env var {@code MONGODB_IAM_AUTH=true}),
     * the connection uses the MONGODB-AWS authentication mechanism with
     * {@link MongoCredential#createAwsCredential(String, char[]) createAwsCredential(null, null)},
     * which resolves AWS credentials automatically from the default credential chain
     * (environment variables, EC2 instance profile, ECS task role, etc.).
     * This is the recommended approach for DocumentDB IAM authentication.
     *
     * <p>When IAM auth is disabled (the default), the driver uses whatever credentials are
     * configured via {@code spring.data.mongodb.username} / {@code spring.data.mongodb.password}.
     */
    @Bean
    @Order(org.springframework.core.Ordered.LOWEST_PRECEDENCE)
    @org.springframework.boot.autoconfigure.condition.ConditionalOnBean(MongoProperties.class)
    public org.springframework.boot.autoconfigure.mongo.MongoClientSettingsBuilderCustomizer mongoClientSettingsBuilderCustomizer(
            @Value("${spring.data.mongodb.iam-auth:false}") boolean iamAuth,
            MongoProperties mongoProperties) {
        return builder -> {
            builder.uuidRepresentation(org.bson.UuidRepresentation.STANDARD);
            builder.retryWrites(false);
            if (iamAuth) {
                if (mongoProperties.getUsername() != null && !mongoProperties.getUsername().isBlank()) {
                    log.warn("spring.data.mongodb.iam-auth is true but a username is also configured. " +
                            "Username/password credentials will be ignored in favour of the AWS credential chain.");
                }
                // Passing null, null causes the MongoDB driver to resolve AWS credentials
                // from the default credential chain (env vars, instance profile, ECS role, etc.)
                builder.credential(MongoCredential.createAwsCredential(null, null));
            }
        };
    }
}
