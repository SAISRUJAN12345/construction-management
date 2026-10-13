package com.example.constructionmanagement.controller;

import com.example.constructionmanagement.dto.ProjectRequest;
import com.example.constructionmanagement.dto.StatusUpdateRequest;
import com.example.constructionmanagement.dto.TaskRequest;
import com.example.constructionmanagement.model.Project;
import com.example.constructionmanagement.model.ProjectStatus;
import com.example.constructionmanagement.model.Task;
import com.example.constructionmanagement.service.ConstructionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@Tag(name = "Construction Projects", description = "Manage construction projects and project tasks")
public class ProjectController {

    private final ConstructionService constructionService;

    public ProjectController(ConstructionService constructionService) {
        this.constructionService = constructionService;
    }

    @GetMapping
    @Operation(summary = "List projects", description = "Optionally filter projects by their status")
    public List<Project> findAllProjects(@RequestParam(required = false) ProjectStatus status) {
        return constructionService.findAllProjects(status);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a project by ID")
    public Project findProject(@PathVariable Long id) {
        return constructionService.findProject(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a project")
    public Project createProject(@Valid @RequestBody ProjectRequest request) {
        return constructionService.createProject(request);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Replace project details")
    public Project updateProject(@PathVariable Long id, @Valid @RequestBody ProjectRequest request) {
        return constructionService.updateProject(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a project and its tasks")
    public void deleteProject(@PathVariable Long id) {
        constructionService.deleteProject(id);
    }

    @PostMapping("/{projectId}/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a task to a project")
    public Task addTask(@PathVariable Long projectId, @Valid @RequestBody TaskRequest request) {
        return constructionService.addTask(projectId, request);
    }

    @PatchMapping("/tasks/{taskId}/status")
    @Operation(summary = "Update a task's status")
    public Task updateTaskStatus(@PathVariable Long taskId,
                                 @Valid @RequestBody StatusUpdateRequest request) {
        return constructionService.updateTaskStatus(taskId, request.status());
    }
}
