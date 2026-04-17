package com.openlineage.server.api;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.result.DeleteResult;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminController.class)
public class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MongoTemplate mongoTemplate;

    @Test
    public void testWipeDatabase() throws Exception {
        com.mongodb.client.MongoDatabase db = mock(com.mongodb.client.MongoDatabase.class);
        when(mongoTemplate.getDb()).thenReturn(db);

        mockMvc.perform(delete("/api/v2/admin/database"))
            .andExpect(status().isOk())
            .andExpect(content().string(containsString("wiped")));

        verify(db).drop();
    }

    @Test
    public void testGetDocuments() throws Exception {
        when(mongoTemplate.find(org.mockito.ArgumentMatchers.<org.springframework.data.mongodb.core.query.Query>any(), org.mockito.ArgumentMatchers.<Class<Document>>any(), anyString()))
            .thenReturn(List.of(new Document("_id", "abc")));

        mockMvc.perform(get("/api/v2/admin/collections/jobs"))
            .andExpect(status().isOk());
    }

    @Test
    public void testPurgeOldData() throws Exception {
        DeleteResult deleteResult = mock(DeleteResult.class);
        when(deleteResult.getDeletedCount()).thenReturn(5L);
        when(mongoTemplate.remove(org.mockito.ArgumentMatchers.<org.springframework.data.mongodb.core.query.Query>any(), anyString())).thenReturn(deleteResult);

        String cutoff = "2024-01-01T00:00:00Z";
        mockMvc.perform(post("/api/v2/admin/purge")
                .param("olderThan", cutoff))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.lineage_events").value(5))
            .andExpect(jsonPath("$.cutoffDate").exists());

        verify(mongoTemplate, times(4)).remove(any(Query.class), anyString());
    }

    @Test
    public void testGetStats() throws Exception {
        @SuppressWarnings("unchecked")
        MongoCollection<Document> col = mock(MongoCollection.class);
        when(col.estimatedDocumentCount()).thenReturn(42L);
        when(mongoTemplate.getCollection(anyString())).thenReturn(col);

        mockMvc.perform(get("/api/v2/admin/stats"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.jobs").value(42))
            .andExpect(jsonPath("$.runs").value(42));
    }
}
