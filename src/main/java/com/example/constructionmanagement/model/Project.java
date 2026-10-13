package com.example.constructionmanagement.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "projects")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "name must not be blank")
    @Size(max = 160, message = "name must be at most 160 characters")
    @Column(nullable = false, length = 160)
    private String name;

    @Size(max = 200, message = "location must be at most 200 characters")
    @Column(length = 200)
    private String location;

    @Size(max = 160, message = "clientName must be at most 160 characters")
    @Column(length = 160)
    private String clientName;

    @DecimalMin(value = "0.0", message = "budget must be at least 0.0")
    @Digits(integer = 17, fraction = 2, message = "budget must have at most 17 integer digits and 2 decimal places")
    @Column(precision = 19, scale = 2)
    private BigDecimal budget;

    private LocalDate startDate;

    private LocalDate endDate;

    @NotNull(message = "status is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectStatus status = ProjectStatus.PLANNED;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("project")
    private List<Task> tasks = new ArrayList<>();
}
