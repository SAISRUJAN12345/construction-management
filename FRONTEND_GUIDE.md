# Buildwise Web Dashboard

The construction-management frontend is a responsive dashboard served directly by Spring Boot. No separate npm build is required.

## Run locally

1. Install Java 17 and make sure this project's dependencies can be downloaded.
2. From the repository root, run `./mvnw spring-boot:run` (if 8080 is occupied, use `PORT=8081 ./mvnw spring-boot:run`).
3. Open `http://localhost:8080/` (or port `8081` if using the alternate port).

## Dashboard features

- Portfolio stats: number of projects, in-progress projects, combined budgets, and completed tasks.
- Project search and status filter, grid and list layouts.
- Create, edit and delete projects.
- Project detail drawer with client, location, budget, timeline and task progress.
- Create tasks and update task states from `TODO`, `IN_PROGRESS`, and `DONE`.
- Upcoming tasks, team workload summary, and a full tasks view.
- Inline validation/error messages and API connection status.
- Responsive layout for desktop and mobile.

## API connection

The frontend is in `src/main/resources/static/` and calls `/api/projects` on the same origin. It is packaged into the Spring Boot JAR and deployed with the backend, so there is no separate frontend host or CORS setup.

## Render

The existing `render.yaml` Blueprint builds the Docker web service and provisions PostgreSQL. After pushing the repository to GitHub, open Render's Blueprint dashboard, create a Blueprint from the repository, and review the resources before deploying. The web service URL opens the dashboard at `/`, Swagger at `/swagger-ui.html`, and health at `/actuator/health`.
