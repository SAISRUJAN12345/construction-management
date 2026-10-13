package com.example.constructionmanagement.dto;

import com.example.constructionmanagement.model.TaskStatus;
import jakarta.validation.constraints.NotNull;

public record StatusUpdateRequest(
        @NotNull(message = "status is required") TaskStatus status
) {
}
