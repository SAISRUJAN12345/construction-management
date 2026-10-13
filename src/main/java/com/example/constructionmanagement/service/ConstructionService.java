package com.example.constructionmanagement.service;

import com.example.constructionmanagement.dto.ProjectRequest;
import com.example.constructionmanagement.dto.TaskRequest;
import com.example.constructionmanagement.model.Project;
import com.example.constructionmanagement.model.ProjectStatus;
import com.example.constructionmanagement.model.Task;
import com.example.constructionmanagement.model.TaskStatus;
import com.example.constructionmanagement.repository.ProjectRepository;
import com.example.constructionmanagement.repository.TaskRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional
public class ConstructionService {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;

    public ConstructionService(ProjectRepository projectRepository, TaskRepository taskRepository) {
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
    }

    @Transactional(readOnly = true)
    public List<Project> findAllProjects(ProjectStatus status) {
        return status == null ? projectRepository.findAll() : projectRepository.findByStatus(status);
    }

    @Transactional(readOnly = true)
    public Project findProject(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Project not found with id: " + id));
    }

    public Project createProject(ProjectRequest request) {
        Project project = new Project();
        applyProjectDetails(project, request);
        project.setTasks(new java.util.ArrayList<>());
        return projectRepository.save(project);
    }

    public Project updateProject(Long id, ProjectRequest request) {
        Project existing = findProject(id);
        applyProjectDetails(existing, request);
        return projectRepository.save(existing);
    }

    public void deleteProject(Long id) {
        Project project = findProject(id);
        projectRepository.delete(project);
    }

    public Task addTask(Long projectId, TaskRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Project not found with id: " + projectId));

        Task task = new Task();
        task.setTitle(request.title().trim());
        task.setDescription(request.description());
        task.setAssignee(request.assignee());
        task.setDueDate(request.dueDate());
        task.setStatus(request.status() == null ? TaskStatus.TODO : request.status());
        task.setProject(project);
        project.getTasks().add(task);
        return taskRepository.save(task);
    }

    public Task updateTaskStatus(Long taskId, TaskStatus status) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Task not found with id: " + taskId));
        task.setStatus(status);
        return taskRepository.save(task);
    }

    private void applyProjectDetails(Project project, ProjectRequest request) {
        if (request.startDate() != null && request.endDate() != null
                && request.endDate().isBefore(request.startDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "endDate must be on or after startDate");
        }
        project.setName(request.name().trim());
        project.setLocation(request.location());
        project.setClientName(request.clientName());
        project.setBudget(request.budget());
        project.setStartDate(request.startDate());
        project.setEndDate(request.endDate());
        project.setStatus(request.status());
    }
}
