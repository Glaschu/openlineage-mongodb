package com.openlineage.server.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record RunEvent(
    String eventType,
    ZonedDateTime eventTime,
    Run run,
    Job job,
    List<Dataset> inputs,
    List<Dataset> outputs,
    String producer,
    String schemaURL
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Run(String runId, Map<String, Object> facets) {}
}
