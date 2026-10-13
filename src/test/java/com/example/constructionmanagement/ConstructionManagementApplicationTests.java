package com.example.constructionmanagement;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.containsString;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ConstructionManagementApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void contextLoadsAndDemoProjectIsAvailable() throws Exception {
        mockMvc.perform(get("/api/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Riverside Office Tower"))
                .andExpect(jsonPath("$[0].tasks[0].title").value("Pour foundation slab"));
    }

    @Test
    void projectsCanBeFilteredByStatus() throws Exception {
        mockMvc.perform(get("/api/projects").param("status", "IN_PROGRESS"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("IN_PROGRESS"));
    }

    @Test
    void invalidProjectReturnsRequestedValidationErrorShape() throws Exception {
        mockMvc.perform(post("/api/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\" \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors.name").exists());
    }

    @Test
    void negativeBudgetAndInvalidDateRangeAreRejected() throws Exception {
        mockMvc.perform(post("/api/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Invalid budget\",\"budget\":-1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.budget").exists());

        mockMvc.perform(post("/api/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Invalid dates\",\"startDate\":\"2026-12-01\",\"endDate\":\"2026-01-01\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.endDate").exists());
    }

    @Test
    void projectCanBeCreatedUpdatedAndDeleted() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Test Commercial Build",
                                  "location": "Hyderabad, India",
                                  "clientName": "Example Client",
                                  "budget": 125000.50,
                                  "startDate": "2026-11-01",
                                  "endDate": "2027-02-01"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Test Commercial Build"))
                .andExpect(jsonPath("$.status").value("PLANNED"))
                .andExpect(jsonPath("$.tasks").isEmpty())
                .andReturn();

        long projectId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asLong();

        mockMvc.perform(put("/api/projects/{id}", projectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Updated Commercial Build",
                                  "location": "Pune, India",
                                  "clientName": "Updated Client",
                                  "budget": 175000,
                                  "startDate": "2026-11-01",
                                  "endDate": "2027-03-01",
                                  "status": "IN_PROGRESS"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Commercial Build"))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

        mockMvc.perform(delete("/api/projects/{id}", projectId))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/projects/{id}", projectId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.errors.message").exists());
    }

    @Test
    void taskCanBeCreatedAndItsStatusUpdated() throws Exception {
        MvcResult projects = mockMvc.perform(get("/api/projects"))
                .andExpect(status().isOk()).andReturn();
        JsonNode projectArray = objectMapper.readTree(projects.getResponse().getContentAsString());
        long projectId = projectArray.get(0).get("id").asLong();

        MvcResult taskResult = mockMvc.perform(post("/api/projects/{projectId}/tasks", projectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Install temporary site fencing",
                                  "description": "Secure the work area",
                                  "assignee": "Alex",
                                  "dueDate": "2026-11-15"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Install temporary site fencing"))
                .andExpect(jsonPath("$.status").value("TODO"))
                .andExpect(jsonPath("$.project").doesNotExist())
                .andReturn();
        long taskId = objectMapper.readTree(taskResult.getResponse().getContentAsString())
                .get("id").asLong();

        mockMvc.perform(patch("/api/projects/tasks/{taskId}/status", taskId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DONE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DONE"));
    }

    @Test
    void unknownTaskAndInvalidStatusReturnStructuredErrors() throws Exception {
        mockMvc.perform(patch("/api/projects/tasks/{taskId}/status", 999999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DONE\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errors.message").exists());

        mockMvc.perform(get("/api/projects").param("status", "NOT_A_STATUS"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.status").exists());
    }

    @Test
    void taskTitleIsRequired() throws Exception {
        MvcResult projects = mockMvc.perform(get("/api/projects"))
                .andExpect(status().isOk()).andReturn();
        long projectId = objectMapper.readTree(projects.getResponse().getContentAsString())
                .get(0).get("id").asLong();

        mockMvc.perform(post("/api/projects/{projectId}/tasks", projectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\" \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title").exists());
    }

    @Test
    void dashboardIsServedFromRoot() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                .andExpect(content().string(containsString("Buildwise")));
    }

    @Test
    void healthEndpointIsExposed() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }
}
