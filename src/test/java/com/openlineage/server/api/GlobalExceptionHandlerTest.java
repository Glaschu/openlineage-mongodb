package com.openlineage.server.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlineage.server.domain.RunEvent;
import com.openlineage.server.service.LineageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.ZonedDateTime;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests GlobalExceptionHandler behaviour through the RunEventController's
 * @ControllerAdvice being picked up in the @WebMvcTest slice.
 */
@WebMvcTest(RunEventController.class)
public class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private LineageService lineageService;

    private RunEvent buildEvent(String runId) {
        return new RunEvent(
            "START", ZonedDateTime.now(),
            new RunEvent.Run(runId, Collections.emptyMap()),
            new com.openlineage.server.domain.Job("ns", "job", null),
            Collections.emptyList(), Collections.emptyList(),
            "producer", "schema");
    }

    @Test
    public void testResponseStatusExceptionReturnsJson() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "namespace not allowed"))
            .when(lineageService).ingestEvent(any(), any());

        mockMvc.perform(post("/api/v2/lineage")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildEvent("run-1"))))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.status").value(403))
            .andExpect(jsonPath("$.message").value("namespace not allowed"));
    }

    @Test
    public void testGenericExceptionReturns500() throws Exception {
        doThrow(new RuntimeException("unexpected database error"))
            .when(lineageService).ingestEvent(any(), any());

        mockMvc.perform(post("/api/v2/lineage")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildEvent("run-2"))))
            .andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.status").value(500));
    }

    @Test
    public void testIllegalArgumentExceptionReturns400() throws Exception {
        doThrow(new IllegalArgumentException("invalid namespace format"))
            .when(lineageService).ingestEvent(any(), any());

        mockMvc.perform(post("/api/v2/lineage")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildEvent("run-3"))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.message").value("invalid namespace format"));
    }
}
