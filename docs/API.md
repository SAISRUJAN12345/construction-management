# Construction Management API

Base path: `/api/projects`

All JSON requests use `Content-Type: application/json`. Dates use ISO format `YYYY-MM-DD`. Enum names are case-sensitive.

## Projects

### List projects

`GET /api/projects`

Optional status filter: `GET /api/projects?status=IN_PROGRESS`

Allowed `ProjectStatus` values: `PLANNED`, `IN_PROGRESS`, `ON_HOLD`, `COMPLETED`.

### Get one project

`GET /api/projects/{id}`

Returns the project and its tasks. Missing IDs return HTTP 404.

### Create a project

`POST /api/projects` — returns HTTP 201.

```json
{
  "name": "Riverside Office Tower",
  "location": "Pune, India",
  "clientName": "Acme Developers",
  "budget": 2500000.00,
  "startDate": "2026-01-15",
  "endDate": "2027-06-30",
  "status": "IN_PROGRESS"
}
```

Required: non-blank `name` (maximum 160 characters). `budget` may be omitted or `null`; if supplied it must be non-negative and use at most two fractional digits. `location` has a maximum of 200 characters and `clientName` a maximum of 160 characters. `status` defaults to `PLANNED`. If both dates are supplied, `endDate` must not precede `startDate`. New projects start with an empty task list; create tasks using the task endpoint below.

### Replace project details

`PUT /api/projects/{id}` — returns HTTP 200. Send the same payload shape as project creation. Project tasks are not replaced by this endpoint. A nonexistent ID returns HTTP 404.

### Delete a project

`DELETE /api/projects/{id}` — returns HTTP 204. Related tasks are deleted via cascade/orphan removal.

## Tasks

### Add a task

`POST /api/projects/{projectId}/tasks` — returns HTTP 201.

```json
{
  "title": "Pour foundation slab",
  "description": "Prepare and pour the concrete foundation slab",
  "assignee": "Ravi Kumar",
  "dueDate": "2026-11-01",
  "status": "IN_PROGRESS"
}
```

`title` is required and cannot be blank (maximum 200 characters). `description` is limited to 4000 characters; `assignee` is limited to 160 characters. `status` is optional and defaults to `TODO`.

Allowed `TaskStatus` values: `TODO`, `IN_PROGRESS`, `DONE`.

### Update a task status

`PATCH /api/projects/tasks/{taskId}/status` — returns HTTP 200.

```json
{ "status": "DONE" }
```

`status` is required. A nonexistent task returns HTTP 404.

## Error responses

Request validation errors return HTTP 400 with this structure:

```json
{
  "status": 400,
  "errors": {
    "name": "name must not be blank"
  }
}
```

Malformed JSON, unknown enum values, invalid query parameters, bad project date ranges, and not-found resources use the same `status`/`errors` shape. The `errors` object maps field names (or `message` for resource-not-found errors) to readable messages. Stack traces are not returned.

## Local URLs

- Dashboard: `/`
- Swagger UI: `/swagger-ui.html`
- OpenAPI JSON: `/v3/api-docs`
- Health: `/actuator/health`
