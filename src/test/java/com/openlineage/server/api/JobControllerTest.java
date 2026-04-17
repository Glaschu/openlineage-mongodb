package com.openlineage.server.api;

import com.openlineage.server.api.models.JobResponse;
import com.openlineage.server.mapper.JobMapper;
import com.openlineage.server.storage.document.JobDocument;
import com.openlineage.server.storage.document.MarquezId;
import com.openlineage.server.storage.repository.JobRepository;
import com.openlineage.server.storage.repository.RunRepository;
import com.openlineage.server.storage.repository.TagRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.SliceImpl;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = JobController.class)
public class JobControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JobRepository jobRepository;

    @MockBean
    private RunRepository runRepository;

    @MockBean
    private TagRepository tagRepository;

    @MockBean
    private JobMapper jobMapper;

    @MockBean
    private MongoTemplate mongoTemplate;

    @Test
    public void testListAllJobs() throws Exception {
        JobDocument doc = new JobDocument("default", "job1", Collections.emptyMap(), Collections.emptySet(), Collections.emptySet(), ZonedDateTime.now());
        when(mongoTemplate.count(any(), eq(JobDocument.class))).thenReturn(1L);
        when(mongoTemplate.find(any(), eq(JobDocument.class))).thenReturn(Collections.singletonList(doc));
        when(runRepository.findByJobNamespaceAndJobName(any(), any(), any())).thenReturn(new SliceImpl<>(Collections.emptyList()));
        
        JobResponse response = new JobResponse(new JobResponse.JobId("default", "job1"), "type", "job1", "job1", null, null, "default", Collections.emptySet(), Collections.emptySet(), Collections.emptySet(), null, "description", null, Collections.emptyList(), Collections.emptyMap(), null, null, null, null, Collections.emptyList(), null);
        when(jobMapper.toResponse(any(), any())).thenReturn(response);

        mockMvc.perform(get("/api/v2/jobs")
                        .param("limit", "10")
                        .param("offset", "0")
                        .param("rootOnly", "true")
                        .param("hasLineage", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobs[0].name").value("job1"))
                .andExpect(jsonPath("$.totalCount").value(1));
    }

    @Test
    public void testListJobsByNamespace() throws Exception {
        JobDocument doc = new JobDocument("default", "job1", Collections.emptyMap(), Collections.emptySet(), Collections.emptySet(), ZonedDateTime.now());
        when(mongoTemplate.count(any(), eq(JobDocument.class))).thenReturn(1L);
        when(mongoTemplate.find(any(), eq(JobDocument.class))).thenReturn(Collections.singletonList(doc));
        when(runRepository.findByJobNamespaceAndJobName(any(), any(), any())).thenReturn(new SliceImpl<>(Collections.emptyList()));
        
        JobResponse response = new JobResponse(new JobResponse.JobId("default", "job1"), "type", "job1", "job1", null, null, "default", Collections.emptySet(), Collections.emptySet(), Collections.emptySet(), null, "description", null, Collections.emptyList(), Collections.emptyMap(), null, null, null, null, Collections.emptyList(), null);
        when(jobMapper.toResponse(any(), any())).thenReturn(response);

        mockMvc.perform(get("/api/v2/namespaces/default/jobs")
                        .param("parentJobName", "parentJob"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobs[0].name").value("job1"))
                .andExpect(jsonPath("$.totalCount").value(1));
    }

    @Test
    public void testGetJob() throws Exception {
        JobDocument doc = new JobDocument("default", "job1", Collections.emptyMap(), Collections.emptySet(), Collections.emptySet(), ZonedDateTime.now());
        when(jobRepository.findById(new MarquezId("default", "job1"))).thenReturn(Optional.of(doc));
        when(runRepository.findByJobNamespaceAndJobName(any(), any(), any())).thenReturn(new SliceImpl<>(Collections.emptyList()));
        
        JobResponse response = new JobResponse(new JobResponse.JobId("default", "job1"), "type", "job1", "job1", null, null, "default", Collections.emptySet(), Collections.emptySet(), Collections.emptySet(), null, "description", null, Collections.emptyList(), Collections.emptyMap(), null, null, null, null, Collections.emptyList(), null);
        when(jobMapper.toResponse(any(), any())).thenReturn(response);

        mockMvc.perform(get("/api/v2/namespaces/default/jobs/job1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("job1"));
    }

    @Test
    public void testGetJobNotFound() throws Exception {
        when(jobRepository.findById(any())).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v2/namespaces/default/jobs/job1"))
                .andExpect(status().isNotFound());
    }

    @Test
    public void testUpdateJob() throws Exception {
        JobDocument doc = new JobDocument("default", "job1", Collections.emptyMap(), Collections.emptySet(), Collections.emptySet(), ZonedDateTime.now());
        when(jobRepository.findById(any())).thenReturn(Optional.empty());
        when(jobRepository.save(any())).thenReturn(doc);
        when(runRepository.findByJobNamespaceAndJobName(any(), any(), any())).thenReturn(new SliceImpl<>(Collections.emptyList()));
        
        JobResponse response = new JobResponse(new JobResponse.JobId("default", "job1"), "type", "job1", "job1", null, null, "default", Collections.emptySet(), Collections.emptySet(), Collections.emptySet(), null, "description", null, Collections.emptyList(), Collections.emptyMap(), null, null, null, null, Collections.emptyList(), null);
        when(jobMapper.toResponse(any(), any())).thenReturn(response);

        mockMvc.perform(put("/api/v2/namespaces/default/jobs/job1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("job1"));
    }

    @Test
    public void testDeleteJob() throws Exception {
        when(jobRepository.existsById(any())).thenReturn(true);

        mockMvc.perform(delete("/api/v2/namespaces/default/jobs/job1"))
                .andExpect(status().isNoContent());

        verify(jobRepository).deleteById(new MarquezId("default", "job1"));
    }

    @Test
    public void testAddTag() throws Exception {
        JobDocument doc = new JobDocument("default", "job1", Collections.emptyMap(), Collections.emptySet(), Collections.emptySet(), ZonedDateTime.now());
        when(jobRepository.findById(any())).thenReturn(Optional.of(doc));
        when(jobRepository.save(any())).thenReturn(doc);
        when(runRepository.findByJobNamespaceAndJobName(any(), any(), any())).thenReturn(new SliceImpl<>(Collections.emptyList()));
        
        JobResponse response = new JobResponse(new JobResponse.JobId("default", "job1"), "type", "job1", "job1", null, null, "default", Collections.emptySet(), Collections.emptySet(), Collections.emptySet(), null, "description", null, Collections.emptyList(), Collections.emptyMap(), null, null, null, null, Collections.emptyList(), null);
        when(jobMapper.toResponse(any(), any())).thenReturn(response);

        mockMvc.perform(post("/api/v2/namespaces/default/jobs/job1/tags/tag1"))
                .andExpect(status().isCreated());
    }

    @Test
    public void testDeleteTag() throws Exception {
        JobDocument doc = new JobDocument("default", "job1", Collections.emptyMap(), Collections.emptySet(), Collections.emptySet(), ZonedDateTime.now());
        doc.setTags(new java.util.HashSet<>(java.util.Collections.singletonList("tag1")));
        when(jobRepository.findById(any())).thenReturn(Optional.of(doc));

        mockMvc.perform(delete("/api/v2/namespaces/default/jobs/job1/tags/tag1"))
                .andExpect(status().isNoContent());

        verify(jobRepository).save(any());
    }
}
