# Construction Management REST API

Spring Boot 3.3.5 / Java 17 construction-management application with a REST API and responsive web dashboard for tracking construction projects and their tasks. The dashboard is served by Spring Boot from `src/main/resources/static`, so the web UI and API share the same origin. Maven is the build tool; H2 is used locally and PostgreSQL is used with the `prod` profile.

## Requirements

- Java 17+
- Internet access on the first Maven-wrapper run so Maven and dependencies can be downloaded
- Git and GitHub CLI (`gh`) to publish using the helper script
- Docker and Docker Compose for containerized local PostgreSQL deployment (optional)

## Run locally

From the project directory:

```bash
./mvnw spring-boot:run
```

If port 8080 is already occupied, run on port 8081 instead:

```bash
PORT=8081 ./mvnw spring-boot:run
```

The default profile uses an in-memory H2 database. The demo project is inserted when the database is empty.

- Web dashboard: `http://localhost:8080/`
- API base: `http://localhost:8080/api/projects`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`
- Health: `http://localhost:8080/actuator/health`
- H2 console: `http://localhost:8080/h2-console` (JDBC URL `jdbc:h2:mem:constructiondb`, user `sa`, blank password)

## Web dashboard

Open `http://localhost:8080/` after starting the app. The dashboard connects to `/api/projects` on the same origin and provides:

- Portfolio metrics for project count, active projects, budgets, and completed tasks.
- Search and status filtering, with grid and list layouts.
- Create, edit, and delete projects.
- Project details, date/budget overview, task list, and progress calculation.
- Add tasks and update their statuses (`TODO`, `IN_PROGRESS`, `DONE`).
- Upcoming tasks and a task workload summary.
- Responsive layout for desktop and mobile screens.

The UI expects the API to be available at the same host, so there is no separate frontend server or CORS configuration required. Swagger UI remains available at `/swagger-ui.html`.

See [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) for dashboard features and deployment details.

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/projects` | List projects; optionally use `?status=IN_PROGRESS` |
| GET | `/api/projects/{id}` | Get one project with tasks |
| POST | `/api/projects` | Create a project using a validated `ProjectRequest` body (201) |
| PUT | `/api/projects/{id}` | Replace project details using a validated `ProjectRequest` body |
| DELETE | `/api/projects/{id}` | Delete a project and cascade-delete its tasks (204) |
| POST | `/api/projects/{projectId}/tasks` | Add a task (201) |
| PATCH | `/api/projects/tasks/{taskId}/status` | Update a task status |

Valid project statuses: `PLANNED`, `IN_PROGRESS`, `ON_HOLD`, `COMPLETED`.

Valid task statuses: `TODO`, `IN_PROGRESS`, `DONE`.

## Example requests

Create a project:

```bash
curl -X POST http://localhost:8080/api/projects \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "New Residential Complex",
    "location": "Hyderabad, India",
    "clientName": "Example Properties",
    "budget": 1500000.00,
    "startDate": "2026-11-01",
    "endDate": "2027-11-30",
    "status": "PLANNED"
  }'
```

Add a task (replace `1` with a project ID):

```bash
curl -X POST http://localhost:8080/api/projects/1/tasks \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Inspect reinforcement bars",
    "description": "Check rebar placement before pouring concrete",
    "assignee": "Ravi Kumar",
    "dueDate": "2026-11-05",
    "status": "TODO"
  }'
```

Change task status (replace `1` with a task ID):

```bash
curl -X PATCH http://localhost:8080/api/projects/tasks/1/status \
  -H 'Content-Type: application/json' \
  -d '{"status":"DONE"}'
```

See [docs/API.md](docs/API.md) for complete request examples, validation rules, and error response schemas. Validation errors are returned as JSON with `status` and a field-to-message `errors` map, for example:

```json
{
  "status": 400,
  "errors": {
    "name": "name must not be blank"
  }
}
```

Project requests validate the required name, field lengths, non-negative budget, maximum two-decimal budget precision, and (when both dates are provided) that `endDate` is not earlier than `startDate`. Task requests validate the title and text lengths. Malformed JSON, invalid enum values, validation errors, and not-found errors are returned as structured JSON without stack traces. Project creation always starts with an empty task list; create tasks through `POST /api/projects/{projectId}/tasks` so task validation and relationship ownership remain consistent.

## Docker Compose

Start the application and PostgreSQL:

```bash
DB_PASSWORD=change-this-password docker compose up --build
```

The API is exposed on port 8080 by default. PostgreSQL data is persisted in the `postgres_data` volume. The compose configuration uses a development fallback password of `secret` if `DB_PASSWORD` is not supplied; set a strong secret for local environments.

## Publish to GitHub

Install GitHub CLI if needed on macOS:

```bash
brew install gh
```

Extract the ZIP, open a terminal in the `construction-management` directory, then run:

```bash
./scripts/publish-to-github.sh
```

The script signs in with `gh auth login` if necessary, creates a **private** repository named `construction-management` if it does not exist, and pushes the `main` branch. To use a different repository name, pass it as the first argument. The `.gitignore` excludes `.env` files and the Maven `target/` directory. Never commit production passwords or tokens.

GitHub Actions runs `./mvnw verify` for pushes and pull requests on `main`.

## Deploy to Render

The repository includes `render.yaml`, a Render Blueprint that creates a Docker web service plus a managed PostgreSQL database and connects them using Render's database properties. The `docker-entrypoint.sh` derives the JDBC URL from `DB_HOST`, `DB_PORT`, and `DB_NAME` for this Blueprint. For manual setup, the application still accepts `DB_URL=jdbc:postgresql://<internal-host>:5432/<database>` together with `DB_USERNAME` and `DB_PASSWORD`.

1. Run the GitHub publishing script above.
2. Open [Render Blueprints](https://dashboard.render.com/blueprints) and choose **New Blueprint Instance**.
3. Connect the `construction-management` GitHub repository and select the branch `main`.
4. Review the resources and create the Blueprint. Keep the web service and database in the same region.
5. When the deployment finishes, open the web service URL and verify `/actuator/health`, `/swagger-ui.html`, and `/api/projects`.

The Blueprint explicitly uses Render's Free plans to avoid a paid-service selection. Free web services can sleep after inactivity, and free Render PostgreSQL databases expire after 30 days. This setup is for a demo; upgrade the database and service to suitable paid plans for a persistent production deployment. Review the plan and any potential charges in Render before confirming creation.

Production profile settings: H2 console disabled, PostgreSQL enabled, `ddl-auto=update`, and only the actuator health endpoint exposed. The production demo seeder is disabled, so create your first production project through `POST /api/projects`.
