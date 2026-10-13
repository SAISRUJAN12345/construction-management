package com.example.constructionmanagement.repository;

import com.example.constructionmanagement.model.Project;
import com.example.constructionmanagement.model.ProjectStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    @EntityGraph(attributePaths = "tasks")
    List<Project> findByStatus(ProjectStatus status);

    @Override
    @EntityGraph(attributePaths = "tasks")
    List<Project> findAll();

    @Override
    @EntityGraph(attributePaths = "tasks")
    Optional<Project> findById(Long id);
}
