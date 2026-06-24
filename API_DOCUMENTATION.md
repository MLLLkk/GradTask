# GradTask API Documentation

Base URL for local development:

```text
http://localhost:8000
```

Every protected endpoint requires:

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

For file upload, use `multipart/form-data`.

## Health

### GET /health
Returns API status and is useful for checking that the PHP server is running.

## Authentication

### POST /auth/login

Request:

```json
{
  "email": "leader@gradtask.test",
  "password": "password123"
}
```

Response includes JWT token and user profile.

### GET /auth/me
Returns authenticated user profile.

## Users

### GET /users
Roles: authenticated users.

Query parameters:

- `role` optional: `supervisor`, `team_leader`, `student`
- `search` optional string

Used by the frontend to select project members.

## Dashboard

### GET /dashboard/stats
Returns dashboard cards, priority totals, recent activity, and contribution scores.

For supervisors, statistics cover all projects. For other users, statistics are limited to accessible projects.

## Projects

### GET /projects
Query parameters:

- `search` optional string, searches title, description, supervisor, and leader
- `status` optional: `planned`, `in_progress`, `completed`, `archived`

### POST /projects
Roles: `supervisor`, `team_leader`

```json
{
  "title": "Graduation Project Title",
  "description": "Project description",
  "status": "planned",
  "start_date": "2026-02-01",
  "end_date": "2026-06-30"
}
```

### GET /projects/{id}
Returns:

- project details
- members with contribution scores
- tasks
- files
- permissions, including `can_manage`

### PUT /projects/{id}
Roles: project supervisor or project leader.

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "in_progress",
  "start_date": "2026-02-01",
  "end_date": "2026-06-30"
}
```

### DELETE /projects/{id}
Roles: project supervisor or project leader.

### POST /projects/{id}/members
Roles: project supervisor or project leader.

```json
{
  "user_id": 3,
  "role_in_project": "member"
}
```

Allowed `role_in_project` values:

- `leader`
- `member`

When a user is added as `leader`, the project `leader_id` is updated.

### DELETE /projects/{id}/members/{userId}
Roles: project supervisor or project leader.

## Tasks

### GET /projects/{id}/tasks
Query parameters:

- `status` optional: `pending`, `in_progress`, `completed`
- `assigned_to` optional user id
- `search` optional string

### POST /tasks
Roles: project supervisor or project leader.

The assigned user must already be a member of the project.

```json
{
  "project_id": 1,
  "title": "Prepare final report",
  "description": "Write chapter 4 and screenshots",
  "assigned_to": 4,
  "priority": "high",
  "status": "pending",
  "due_date": "2026-06-28"
}
```

Allowed priority values:

- `low`
- `medium`
- `high`

Allowed status values:

- `pending`
- `in_progress`
- `completed`

### PUT /tasks/{id}
Students can update only the status of tasks assigned to them. Project supervisors and leaders can update full task details.

```json
{
  "status": "completed"
}
```

### DELETE /tasks/{id}
Roles: project supervisor or project leader.

## Comments

### GET /tasks/{id}/comments
Returns comments ordered by oldest first.

### POST /tasks/{id}/comments

```json
{
  "comment": "Please attach the latest screenshot."
}
```

## Files

### GET /projects/{id}/files
Returns project files.

### POST /files/upload
Content-Type: `multipart/form-data`

Fields:

- `project_id`
- `task_id` optional, but must belong to the selected project
- `file`

Allowed file types include PDF, images, Word, PowerPoint, and ZIP. Default max size is 10MB.

### GET /files/{id}/download
Downloads an uploaded file. Requires the same JWT authorization header. Access is limited to project members and supervisors.

## Reports

### GET /reports/project/{id}
Returns structured report data used by the frontend PDF generator.

Response includes:

- project
- summary
- members
- tasks
- generated_at
