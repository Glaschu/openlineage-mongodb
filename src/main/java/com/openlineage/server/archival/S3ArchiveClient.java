package com.openlineage.server.archival;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.openlineage.server.storage.document.RunDocument;
import com.openlineage.server.storage.document.LineageEventDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.time.ZonedDateTime;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "archival.enabled", havingValue = "true")
public class S3ArchiveClient {

    private static final Logger log = LoggerFactory.getLogger(S3ArchiveClient.class);

    private final S3Client s3Client;
    private final ArchivalProperties properties;
    private final ObjectMapper mapper;

    public S3ArchiveClient(ArchivalProperties properties) {
        this.properties = properties;
        this.s3Client = S3Client.builder()
                .region(Region.of(properties.getS3().getRegion()))
                .build();
        this.mapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    /**
     * Upload a serialized run to S3.
     * Key: {prefix}/runs/{year}/{month}/{runId}.json
     */
    public void uploadRun(RunDocument run) {
        String key = buildRunKey(run.getRunId(), run.getCreatedAt());
        upload(key, run);
    }

    /**
     * Upload a serialized event to S3.
     * Key: {prefix}/events/{year}/{month}/{eventId}.json
     */
    public void uploadEvent(LineageEventDocument event) {
        String key = buildEventKey(event.getId(), event.getCreatedAt());
        upload(key, event);
    }

    /**
     * Fetch a run from S3 by scanning possible key patterns.
     * Since we may not know the exact year/month, we try a HEAD check first
     * using a known runId. If that fails, we do a prefix-based list.
     */
    public Optional<RunDocument> fetchRun(String runId) {
        String prefix = properties.getS3().getPrefix() + "/runs/";
        try {
            // List objects with the runId suffix — will match regardless of year/month
            ListObjectsV2Request listReq = ListObjectsV2Request.builder()
                    .bucket(properties.getS3().getBucket())
                    .prefix(prefix)
                    .build();

            ListObjectsV2Response listResp = s3Client.listObjectsV2(listReq);
            for (S3Object obj : listResp.contents()) {
                if (obj.key().endsWith("/" + runId + ".json")) {
                    return Optional.of(download(obj.key(), RunDocument.class));
                }
            }

            return Optional.empty();
        } catch (Exception e) {
            log.warn("Failed to fetch archived run {}: {}", runId, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Fetch an event from S3 by ID.
     */
    public Optional<LineageEventDocument> fetchEvent(String eventId) {
        String prefix = properties.getS3().getPrefix() + "/events/";
        try {
            ListObjectsV2Request listReq = ListObjectsV2Request.builder()
                    .bucket(properties.getS3().getBucket())
                    .prefix(prefix)
                    .build();

            ListObjectsV2Response listResp = s3Client.listObjectsV2(listReq);
            for (S3Object obj : listResp.contents()) {
                if (obj.key().endsWith("/" + eventId + ".json")) {
                    return Optional.of(download(obj.key(), LineageEventDocument.class));
                }
            }

            return Optional.empty();
        } catch (Exception e) {
            log.warn("Failed to fetch archived event {}: {}", eventId, e.getMessage());
            return Optional.empty();
        }
    }

    private <T> void upload(String key, T object) {
        try {
            byte[] data = mapper.writeValueAsBytes(object);
            PutObjectRequest putReq = PutObjectRequest.builder()
                    .bucket(properties.getS3().getBucket())
                    .key(key)
                    .contentType("application/json")
                    .build();

            s3Client.putObject(putReq, RequestBody.fromBytes(data));
            log.debug("Uploaded archive: s3://{}/{}", properties.getS3().getBucket(), key);
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload to S3: " + key, e);
        }
    }

    private <T> T download(String key, Class<T> clazz) {
        try {
            GetObjectRequest getReq = GetObjectRequest.builder()
                    .bucket(properties.getS3().getBucket())
                    .key(key)
                    .build();

            ResponseBytes<GetObjectResponse> resp = s3Client.getObjectAsBytes(getReq);
            return mapper.readValue(resp.asByteArray(), clazz);
        } catch (Exception e) {
            throw new RuntimeException("Failed to download from S3: " + key, e);
        }
    }

    private String buildRunKey(String runId, ZonedDateTime createdAt) {
        int year = createdAt != null ? createdAt.getYear() : ZonedDateTime.now().getYear();
        int month = createdAt != null ? createdAt.getMonthValue() : ZonedDateTime.now().getMonthValue();
        return String.format("%s/runs/%d/%02d/%s.json",
                properties.getS3().getPrefix(), year, month, runId);
    }

    private String buildEventKey(String eventId, ZonedDateTime createdAt) {
        int year = createdAt != null ? createdAt.getYear() : ZonedDateTime.now().getYear();
        int month = createdAt != null ? createdAt.getMonthValue() : ZonedDateTime.now().getMonthValue();
        return String.format("%s/events/%d/%02d/%s.json",
                properties.getS3().getPrefix(), year, month, eventId);
    }
}
