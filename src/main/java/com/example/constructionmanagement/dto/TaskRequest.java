package com.example.constructionmanagement.dto;

import com.example.constructionmanagement.model.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** Request payload for creating a task under an existing project. */
public record TaskRequest(
        @NotBlank(message = "title must not be blank")
        @Size(max = 200, message = "title must be at most 200 characters")
        String title,

        @Size(max = 4000, message = "description must be at most 4000 characters")
        String description,

        @Size(max = 160, message = "assignee must be at most 160 characters")
        String assignee,

        LocalDate dueDate,
        TaskStatus status
) {
}
