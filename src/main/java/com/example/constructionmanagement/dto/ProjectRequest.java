package com.example.constructionmanagement.dto;

import com.example.constructionmanagement.model.ProjectStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Validated request payload used to create or replace project details. */
public record ProjectRequest(
        @NotBlank(message = "name must not be blank")
        @Size(max = 160, message = "name must be at most 160 characters")
        String name,

        @Size(max = 200, message = "location must be at most 200 characters")
        String location,

        @Size(max = 160, message = "clientName must be at most 160 characters")
        String clientName,

        @DecimalMin(value = "0.0", message = "budget must be at least 0.0")
        @Digits(integer = 17, fraction = 2, message = "budget must have at most 17 integer digits and 2 decimal places")
        BigDecimal budget,

        LocalDate startDate,
        LocalDate endDate,
        ProjectStatus status
) {
    public ProjectRequest {
        if (status == null) {
            status = ProjectStatus.PLANNED;
        }
    }
}
