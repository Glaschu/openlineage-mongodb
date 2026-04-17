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

import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RunEventController.class)
public class RunEventControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private LineageService lineageService;

    private RunEvent buildEvent(String runId) {
        return new RunEvent(
            "START",
            ZonedDateTime.now(),
            new RunEvent.Run(runId, Collections.emptyMap()),
            new com.openlineage.server.domain.Job("test-ns", "test-job", null),
            Collections.emptyList(),
            Collections.emptyList(),
            "test-producer",
            "http://schema.url"
        );
    }

    @Test
    public void testPostSingleEvent() throws Exception {
        RunEvent event = buildEvent("run-1");
        mockMvc.perform(post("/api/v2/lineage")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(event)))
            .andExpect(status().isCreated());

        verify(lineageService).ingestEvent(any(RunEvent.class), eq(null));
    }

    @Test
    public void testPostSingleEventWithUser() throws Exception {
        RunEvent event = buildEvent("run-1");
        mockMvc.perform(post("/api/v2/lineage")
                .contentType(MediaType.APPLICATION_JSON)
                .header("x-user", "unit-tester")
                .content(objectMapper.writeValueAsString(event)))
            .andExpect(status().isCreated());

        verify(lineageService).ingestEvent(any(RunEvent.class), eq("unit-tester"));
    }

    @Test
    public void testBulkPostSuccess() throws Exception {
        List<RunEvent> events = List.of(buildEvent("run-2"), buildEvent("run-3"));
        mockMvc.perform(post("/api/v2/lineage/bulk")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(events)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.total").value(2))
            .andExpect(jsonPath("$.success").value(2))
            .andExpect(jsonPath("$.failed").value(0));

        verify(lineageService, times(2)).ingestEvent(any(RunEvent.class), any());
    }

    @Test
    public void testBulkPostEmptyListReturnsZeros() throws Exception {
        mockMvc.perform(post("/api/v2/lineage/bulk")
                .contentType(MediaType.APPLICATION_JSON)
                .content("[]"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.total").value(0))
            .andExpect(jsonPath("$.success").value(0))
            .andExpect(jsonPath("$.failed").value(0));

        verifyNoInteractions(lineageService);
    }

    @Test
    public void testBulkPostPartialFailure() throws Exception {
        RunEvent good = buildEvent("run-ok");
        RunEvent bad = buildEvent("run-bad");

        doNothing().when(lineageService).ingestEvent(any(RunEvent.class), any());
        doThrow(new RuntimeException("failed"))
            .when(lineageService).ingestEvent(argThat(e -> "run-bad".equals(e.run().runId())), any());

        List<RunEvent> events = List.of(good, bad);
        mockMvc.perform(post("/api/v2/lineage/bulk")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(events)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.total").value(2))
            .andExpect(jsonPath("$.success").value(1))
            .andExpect(jsonPath("$.failed").value(1));
    }

    @Test
    public void testBulkPostAllFail() throws Exception {
        RunEvent event = buildEvent("run-allbad");
        doThrow(new RuntimeException("always fails")).when(lineageService).ingestEvent(any(), any());

        mockMvc.perform(post("/api/v2/lineage/bulk")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(event))))
            .andExpect(status().isInternalServerError());
    }

    @Test
    public void testBulkPostTooManyEvents() throws Exception {
        // Build a list that exceeds MAX_BULK_SIZE (500)
        List<RunEvent> events = Collections.nCopies(501, buildEvent("run-overflow"));
        mockMvc.perform(post("/api/v2/lineage/bulk")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(events)))
            .andExpect(status().isBadRequest());

        verifyNoInteractions(lineageService);
    }
}
