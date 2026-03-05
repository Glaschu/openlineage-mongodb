package com.openlineage.server.archival;

import com.openlineage.server.storage.document.RunDocument;
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
public class RunArchivalService {

    private static final Logger log = LoggerFactory.getLogger(RunArchivalService.class);

    private final MongoTemplate mongoTemplate;
    private final S3ArchiveClient s3Client;
    private final ArchivalProperties properties;

    public RunArchivalService(MongoTemplate mongoTemplate, S3ArchiveClient s3Client,
            ArchivalProperties properties) {
        this.mongoTemplate = mongoTemplate;
        this.s3Client = s3Client;
        this.properties = properties;
    }

    @Scheduled(cron = "${archival.cron}")
    public void archiveOldRuns() {
        if (!properties.isEnabled()) {
            return;
        }

        ZonedDateTime cutoff = ZonedDateTime.now().minusDays(properties.getRetentionDays());
        log.info("Starting run archival for runs older than {}", cutoff);

        int totalArchived = 0;
        int totalFailed = 0;

        while (true) {
            Query query = Query.query(Criteria.where("updatedAt").lt(cutoff))
                    .limit(properties.getBatchSize());
            List<RunDocument> batch = mongoTemplate.find(query, RunDocument.class);

            if (batch.isEmpty()) {
                break;
            }

            for (RunDocument run : batch) {
                try {
                    s3Client.uploadRun(run);
                    mongoTemplate.remove(
                            Query.query(Criteria.where("_id").is(run.getRunId())),
                            RunDocument.class);
                    totalArchived++;
                } catch (Exception e) {
                    totalFailed++;
                    log.error("Failed to archive run {}: {}", run.getRunId(), e.getMessage());
                }
            }

            log.info("Archived batch of {} runs ({} total, {} failed)",
                    batch.size(), totalArchived, totalFailed);
        }

        log.info("Run archival complete: {} archived, {} failed", totalArchived, totalFailed);
    }
}
