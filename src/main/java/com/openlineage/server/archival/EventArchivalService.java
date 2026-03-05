package com.openlineage.server.archival;

import com.openlineage.server.storage.document.LineageEventDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.ZonedDateTime;
import java.util.List;

@Service
@ConditionalOnProperty(name = "archival.enabled", havingValue = "true")
public class EventArchivalService {

    private static final Logger log = LoggerFactory.getLogger(EventArchivalService.class);

    private final MongoTemplate mongoTemplate;
    private final S3ArchiveClient s3Client;
    private final ArchivalProperties properties;

    public EventArchivalService(MongoTemplate mongoTemplate, S3ArchiveClient s3Client,
            ArchivalProperties properties) {
        this.mongoTemplate = mongoTemplate;
        this.s3Client = s3Client;
        this.properties = properties;
    }

    /**
     * Archives lineage events older than retention period.
     * Runs 30 minutes after run archival to spread the load.
     */
    @Scheduled(cron = "${archival.cron}")
    public void archiveOldEvents() {
        if (!properties.isEnabled()) {
            return;
        }

        // Archive events slightly earlier than TTL to beat the 90-day expireAfter index
        int archiveDays = Math.max(properties.getRetentionDays() - 10, 30);
        ZonedDateTime cutoff = ZonedDateTime.now().minusDays(archiveDays);
        log.info("Starting event archival for events older than {}", cutoff);

        int totalArchived = 0;
        int totalFailed = 0;

        while (true) {
            Query query = Query.query(Criteria.where("createdAt").lt(cutoff))
                    .limit(properties.getBatchSize());
            List<LineageEventDocument> batch = mongoTemplate.find(query, LineageEventDocument.class);

            if (batch.isEmpty()) {
                break;
            }

            for (LineageEventDocument event : batch) {
                try {
                    s3Client.uploadEvent(event);
                    mongoTemplate.remove(
                            Query.query(Criteria.where("_id").is(event.getId())),
                            LineageEventDocument.class);
                    totalArchived++;
                } catch (Exception e) {
                    totalFailed++;
                    log.error("Failed to archive event {}: {}", event.getId(), e.getMessage());
                }
            }

            log.info("Archived batch of {} events ({} total, {} failed)",
                    batch.size(), totalArchived, totalFailed);
        }

        log.info("Event archival complete: {} archived, {} failed", totalArchived, totalFailed);
    }
}
