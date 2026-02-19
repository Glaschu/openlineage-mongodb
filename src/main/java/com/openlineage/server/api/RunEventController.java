package com.openlineage.server.api;

import com.openlineage.server.domain.RunEvent;
import com.openlineage.server.service.LineageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v2/lineage")
public class RunEventController {
    private static final Logger log = LoggerFactory.getLogger(RunEventController.class);

    private static final int MAX_BULK_SIZE = 500;

    private final LineageService lineageService;

    public RunEventController(LineageService lineageService) {
        this.lineageService = lineageService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public void postEvent(
            @RequestBody RunEvent event,
            @RequestHeader(value = "x-user", required = false) String user) {
        lineageService.ingestEvent(event, user);
    }

    /**
     * Bulk ingestion endpoint — accepts up to MAX_BULK_SIZE events per request.
     * Each event is ingested independently so a single failure does not block others.
     * Failed events are logged and counted; if all fail, a 500 is returned.
     */
    @PostMapping("/bulk")
    @ResponseStatus(HttpStatus.CREATED)
    public BulkIngestionResponse postEventsBulk(
            @RequestBody List<RunEvent> events,
            @RequestHeader(value = "x-user", required = false) String user) {

        if (events == null || events.isEmpty()) {
            return new BulkIngestionResponse(0, 0, 0);
        }

        if (events.size() > MAX_BULK_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Bulk request exceeds maximum size of " + MAX_BULK_SIZE + " events. Received: " + events.size());
        }

        int success = 0;
        int failed = 0;

        for (RunEvent event : events) {
            try {
                lineageService.ingestEvent(event, user);
                success++;
            } catch (Exception e) {
                failed++;
                log.warn("Failed to ingest event for run {}: {}", 
                        event.run() != null ? event.run().runId() : "unknown", e.getMessage());
            }
        }

        if (success == 0 && failed > 0) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "All " + failed + " events failed to ingest");
        }

        return new BulkIngestionResponse(events.size(), success, failed);
    }

    /**
     * Response for bulk ingestion providing visibility into partial failures.
     */
    public record BulkIngestionResponse(int total, int success, int failed) {
    }
}
