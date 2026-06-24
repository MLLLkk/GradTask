# GradTask — Graduation Project Task Manager

GradTask is a full-stack graduation project task management system for supervisors, team leaders, and students. It provides role-based dashboards, project/task management, member management, comments, file uploads/downloads, contribution tracking, and downloadable PDF reports.

## Stack

- Frontend: React.js + Vite + Tailwind CSS
- Backend: PHP REST API
- Database: MySQL
- Authentication: JWT Bearer tokens
- Reports: jsPDF from the React frontend

## Main Roles

- **Supervisor:** view all projects, monitor progress, check overdue work, manage members/tasks, review contribution stats, comment on tasks, and download reports.
- **Team Leader:** create/manage assigned projects, add/remove members, assign tasks, set priorities/deadlines, track progress, and manage files.
- **Student:** view assigned tasks, update assigned task status, comment, and upload/download project files.

## Folder Structure

```text
GradTask_improved/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── core/
│   ├── public/
│   ├── storage/uploads/
│   └── utils/
├── database/
│   ├── schema.sql
│   └── seed.sql
└── frontend/
    ├── src/
    │   ├── api/
    │   ├── components/
    │   ├── context/
    │   ├── pages/
    │   └── utils/
    └── package.json
```

## Development Phases

### Phase 1 — Database and Access Model
Create the normalized MySQL schema, seed demo users/projects/tasks, and define relationships between supervisors, leaders, students, projects, members, tasks, comments, files, and logs.

### Phase 2 — Backend REST API
Build PHP endpoints for authentication, users, dashboard statistics, projects, members, tasks, comments, files, and report data. Protect endpoints using JWT and role-based access checks.

### Phase 3 — Frontend Shell and Authentication
Create the React application, login page, protected routes, AuthContext, sidebar layout, top search, and responsive Tailwind design.

### Phase 4 — Project and Task Workflows
Implement pages for project listing, project details, project editing/deletion, member management, task creation, status updates, comments, and file upload/download.

### Phase 5 — Dashboards, Contribution Tracking, and Reports
Display statistics cards, progress charts, overdue tasks, contribution scores, and generate downloadable project PDF reports.

### Phase 6 — Review and Hardening
Validate inputs, prevent invalid task assignments, restrict full task/project management to project managers, and verify PHP syntax, ESLint, and frontend production build.

## Requirements

- PHP 8.1+
- MySQL 8+
- Node.js 18+
- npm
- XAMPP or PHP built-in server

## Installation

### 1. Open project folder

```bash
cd GradTask_improved
```

### 2. Create MySQL database

```sql
CREATE DATABASE gradtask CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Import schema and seed data:

```bash
mysql -u root -p gradtask < database/schema.sql
mysql -u root -p gradtask < database/seed.sql
```

Using phpMyAdmin, create database `gradtask`, then import `database/schema.sql` first and `database/seed.sql` second.

### 3. Configure backend

Default local settings are in:

```text
backend/config/config.php
```

The defaults work with XAMPP MySQL:

```php
DB_HOST = 127.0.0.1
DB_PORT = 3306
DB_NAME = gradtask
DB_USER = root
DB_PASS = empty password
```

You can also override backend settings using environment variables:

```text
GRADTASK_DB_HOST
GRADTASK_DB_PORT
GRADTASK_DB_NAME
GRADTASK_DB_USER
GRADTASK_DB_PASS
GRADTASK_JWT_SECRET
GRADTASK_ALLOWED_ORIGIN
GRADTASK_DEBUG
```

Make sure uploads directory is writable:

```bash
chmod -R 775 backend/storage/uploads
```

### 4. Run backend

From the project root:

```bash
php -S localhost:8000 -t backend/public backend/public/index.php
```

With XAMPP on Windows:

```powershell
& "C:\xampp\php\php.exe" -S localhost:8000 -t backend/public backend/public/index.php
```

Test API health:

```text
http://localhost:8000/health
```

### 5. Run frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173/login
```

## Demo Accounts

Password for all accounts:

```text
password123
```

| Role | Email |
|---|---|
| Supervisor | supervisor@gradtask.test |
| Team Leader | leader@gradtask.test |
| Student | student1@gradtask.test |
| Student | student2@gradtask.test |

## Key Improvements in This Version

- Added working responsive top search bar.
- Added project edit and delete actions from project details.
- Added team member management UI.
- Added users API for selecting project members.
- Added contribution score display per project member.
- Added downloadable uploaded files with authorization.
- Added backend validation so tasks can only be assigned to project members.
- Added backend validation so uploaded task files must belong to the selected project.
- Restricted project/task management to project managers, not any unrelated team leader.
- Disabled task status update UI for students who are not assigned to the task.
- Added better error/notice messages in main pages.
- Added environment-variable support for backend configuration.
- Added safer enum/date validation.
- Verified PHP syntax, ESLint, and frontend production build.

## Contribution Score Formula

```text
score = completed_task_points + on_time_bonus + update_points + comment_points
```

Priority points:

- Low = 1
- Medium = 2
- High = 3

Other points:

- On-time completion bonus = 1 point per completed task finished on or before due date
- Activity updates = 0.25 point per task/status update
- Comments = 0.5 point per comment

## Production Notes

- Replace `JWT_SECRET` or set `GRADTASK_JWT_SECRET` with a long random secret.
- Restrict `ALLOWED_ORIGIN` or `GRADTASK_ALLOWED_ORIGIN` to your deployed frontend domain.
- Use HTTPS in production.
- Keep uploaded files outside a public web root when deploying.
- Add pagination for large numbers of projects/tasks/files.
- Consider adding email invitations and password reset for a production version.

## Verification Commands Used

```bash
find backend -name "*.php" -print0 | xargs -0 -n1 php -l
cd frontend
npm run lint
npm run build
```

## License

Academic use. You may modify and submit it as part of a university project, but review all code and adapt it to your instructor requirements.
