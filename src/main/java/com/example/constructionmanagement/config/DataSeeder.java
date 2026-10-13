package com.example.constructionmanagement.config;

import com.example.constructionmanagement.model.Project;
import com.example.constructionmanagement.model.ProjectStatus;
import com.example.constructionmanagement.model.Task;
import com.example.constructionmanagement.model.TaskStatus;
import com.example.constructionmanagement.repository.ProjectRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;

@Component
@Profile("!prod")
public class DataSeeder implements CommandLineRunner {

    private final ProjectRepository projectRepository;

    public DataSeeder(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    @Override
    public void run(String... args) {
        if (projectRepository.count() > 0) {
            return;
        }

        Project project = new Project();
        project.setName("Riverside Office Tower");
        project.setLocation("Pune, India");
        project.setClientName("Acme Developers");
        project.setBudget(new BigDecimal("2500000.00"));
        project.setStartDate(LocalDate.of(2026, 1, 15));
        project.setEndDate(LocalDate.of(2027, 6, 30));
        project.setStatus(ProjectStatus.IN_PROGRESS);
        project.setTasks(new ArrayList<>());

        Task task = new Task();
        task.setTitle("Pour foundation slab");
        task.setAssignee("Ravi Kumar");
        task.setDueDate(LocalDate.of(2026, 11, 1));
        task.setStatus(TaskStatus.IN_PROGRESS);
        task.setProject(project);
        project.getTasks().add(task);

        projectRepository.save(project);
    }
}
