package com.openlineage.server.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.server.ResponseStatusException;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Global exception handler.
 * 
 * Behaviour:
 * - ALWAYS logs full stack trace to server logs (visible in CloudWatch / kubectl logs)
 * - Non-prod: returns exception message + stack trace in the API response body
 * - Prod: returns generic message only (no implementation details leaked)
 * 
 * Controlled via spring.profiles.active. Any profile containing "prod" is
 * treated as production.
 */
@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @Value("${spring.profiles.active:default}")
    private String activeProfile;

    private boolean isProduction() {
        return activeProfile != null && activeProfile.toLowerCase().contains("prod");
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(ResponseStatusException ex) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());

        log.error("ResponseStatusException [{}]: {}", status, ex.getReason(), ex);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", ZonedDateTime.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", ex.getReason());

        if (!isProduction()) {
            body.put("exception", ex.getClass().getName());
            if (ex.getCause() != null) {
                body.put("cause", ex.getCause().getMessage());
            }
        }

        return new ResponseEntity<>(body, ex.getStatusCode());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        // Always log the full stack trace — this goes to CloudWatch / kubectl logs
        log.error("Unhandled exception caught by GlobalExceptionHandler", ex);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", ZonedDateTime.now().toString());
        body.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        body.put("error", HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase());

        if (isProduction()) {
            // Prod: never expose implementation details
            body.put("message", "An unexpected error occurred");
        } else {
            // Non-prod: full details for debugging
            body.put("message", ex.getMessage());
            body.put("exception", ex.getClass().getName());
            body.put("stackTrace", getStackTraceLines(ex));
            if (ex.getCause() != null) {
                body.put("cause", ex.getCause().getMessage());
            }
        }

        return new ResponseEntity<>(body, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Bad request: {}", ex.getMessage(), ex);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", ZonedDateTime.now().toString());
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", HttpStatus.BAD_REQUEST.getReasonPhrase());
        body.put("message", ex.getMessage());

        if (!isProduction()) {
            body.put("exception", ex.getClass().getName());
        }

        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    private String[] getStackTraceLines(Exception ex) {
        StringWriter sw = new StringWriter();
        ex.printStackTrace(new PrintWriter(sw));
        return Arrays.stream(sw.toString().split("\n"))
                .limit(30) // Cap at 30 lines to avoid bloated responses
                .toArray(String[]::new);
    }
}
