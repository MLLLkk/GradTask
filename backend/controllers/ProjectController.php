<?php

class ProjectController
{
    private function recalculateProgress(int $projectId): void
    {
        $db = Database::connect();
        $stmt = $db->prepare("SELECT COUNT(*) total, COALESCE(SUM(status = 'completed'),0) completed FROM tasks WHERE project_id = ?");
        $stmt->execute([$projectId]);
        $row = $stmt->fetch();
        $progress = ((int)$row['total'] === 0) ? 0 : round(((int)$row['completed'] / (int)$row['total']) * 100, 2);
        $update = $db->prepare('UPDATE projects SET progress = ? WHERE id = ?');
        $update->execute([$progress, $projectId]);
    }

    private function projectExists(int $id): void
    {
        $stmt = Database::connect()->prepare('SELECT 1 FROM projects WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetchColumn()) {
            Response::error('Project not found', 404);
        }
    }

    public function index(): void
    {
        $user = Auth::user();
        $db = Database::connect();
        $search = trim($_GET['search'] ?? '');
        $status = trim($_GET['status'] ?? '');

        $where = [];
        $params = [];

        if ($user['role'] !== 'supervisor') {
            $where[] = '(p.leader_id = ? OR p.supervisor_id = ? OR p.id IN (SELECT project_id FROM project_members WHERE user_id = ?))';
            array_push($params, $user['id'], $user['id'], $user['id']);
        }
        if ($search !== '') {
            $where[] = '(p.title LIKE ? OR p.description LIKE ? OR s.name LIKE ? OR l.name LIKE ?)';
            array_push($params, "%$search%", "%$search%", "%$search%", "%$search%");
        }
        if ($status !== '') {
            Request::enum($status, ['planned', 'in_progress', 'completed', 'archived'], 'status');
            $where[] = 'p.status = ?';
            $params[] = $status;
        }
        $whereSql = count($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        $stmt = $db->prepare("SELECT p.*, s.name supervisor_name, l.name leader_name,
            COUNT(DISTINCT pm.user_id) members_count,
            COUNT(DISTINCT t.id) tasks_count,
            COALESCE(SUM(t.status = 'completed'), 0) completed_tasks
            FROM projects p
            LEFT JOIN users s ON s.id = p.supervisor_id
            LEFT JOIN users l ON l.id = p.leader_id
            LEFT JOIN project_members pm ON pm.project_id = p.id
            LEFT JOIN tasks t ON t.project_id = p.id
            $whereSql
            GROUP BY p.id
            ORDER BY p.updated_at DESC");
        $stmt->execute($params);
        Response::success($stmt->fetchAll());
    }

    public function show(int $id): void
    {
        $user = Auth::user();
        Auth::ensureProjectAccess($id, $user);
        $this->recalculateProgress($id);

        $db = Database::connect();
        $projectStmt = $db->prepare('SELECT p.*, s.name supervisor_name, l.name leader_name FROM projects p LEFT JOIN users s ON s.id = p.supervisor_id LEFT JOIN users l ON l.id = p.leader_id WHERE p.id = ?');
        $projectStmt->execute([$id]);
        $project = $projectStmt->fetch();
        if (!$project) {
            Response::error('Project not found', 404);
        }

        $membersStmt = $db->prepare('SELECT u.id, u.name, u.email, u.role, pm.role_in_project, pm.joined_at,
            COUNT(t.id) assigned_tasks,
            COALESCE(SUM(t.status = "completed"), 0) completed_tasks,
            COALESCE(SUM(CASE WHEN t.status = "completed" THEN CASE t.priority WHEN "high" THEN 3 WHEN "medium" THEN 2 ELSE 1 END ELSE 0 END),0)
            + COALESCE(SUM(CASE WHEN t.status = "completed" AND t.completed_at IS NOT NULL AND t.due_date IS NOT NULL AND DATE(t.completed_at) <= t.due_date THEN 1 ELSE 0 END),0)
            + COALESCE((SELECT COUNT(*) * 0.5 FROM comments c WHERE c.user_id = u.id AND c.task_id IN (SELECT id FROM tasks WHERE project_id = ?)),0)
            + COALESCE((SELECT COUNT(*) * 0.25 FROM activity_logs al WHERE al.user_id = u.id AND al.project_id = ? AND al.action LIKE "task_%"),0)
            AS contribution_score
            FROM project_members pm
            JOIN users u ON u.id = pm.user_id
            LEFT JOIN tasks t ON t.assigned_to = u.id AND t.project_id = pm.project_id
            WHERE pm.project_id = ?
            GROUP BY u.id, u.name, u.email, u.role, pm.role_in_project, pm.joined_at
            ORDER BY pm.role_in_project, u.name');
        $membersStmt->execute([$id, $id, $id]);

        $tasksStmt = $db->prepare('SELECT t.*, u.name assigned_name, c.name created_by_name FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to LEFT JOIN users c ON c.id = t.created_by WHERE t.project_id = ? ORDER BY t.due_date IS NULL, t.due_date ASC, FIELD(t.priority, "high", "medium", "low")');
        $tasksStmt->execute([$id]);

        $filesStmt = $db->prepare('SELECT f.*, u.name uploaded_by_name FROM files f JOIN users u ON u.id = f.uploaded_by WHERE f.project_id = ? ORDER BY f.created_at DESC');
        $filesStmt->execute([$id]);

        Response::success([
            'project' => $project,
            'members' => $membersStmt->fetchAll(),
            'tasks' => $tasksStmt->fetchAll(),
            'files' => $filesStmt->fetchAll(),
            'permissions' => [
                'can_manage' => Auth::isProjectManager($id, $user),
            ],
        ]);
    }

    public function create(): void
    {
        $user = Auth::requireRoles(['supervisor', 'team_leader']);
        $data = Request::json();
        Request::required($data, ['title']);

        $db = Database::connect();
        $status = Request::enum(Request::value($data, 'status', 'planned'), ['planned', 'in_progress', 'completed', 'archived'], 'status');
        $supervisorId = Request::value($data, 'supervisor_id', $user['role'] === 'supervisor' ? $user['id'] : null) ?: null;
        $leaderId = Request::value($data, 'leader_id', $user['role'] === 'team_leader' ? $user['id'] : null) ?: null;

        $stmt = $db->prepare('INSERT INTO projects (title, description, status, supervisor_id, leader_id, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            trim($data['title']),
            Request::value($data, 'description') ? trim((string)$data['description']) : null,
            $status,
            $supervisorId,
            $leaderId,
            Request::dateOrNull(Request::value($data, 'start_date'), 'start_date'),
            Request::dateOrNull(Request::value($data, 'end_date'), 'end_date'),
        ]);
        $projectId = (int)$db->lastInsertId();

        $memberStmt = $db->prepare('INSERT IGNORE INTO project_members (project_id, user_id, role_in_project) VALUES (?, ?, ?)');
        if ($leaderId) {
            $memberStmt->execute([$projectId, $leaderId, 'leader']);
        }
        if ($supervisorId && $supervisorId !== $leaderId) {
            // Supervisors can see all projects globally, so they do not need a project_members record.
        }

        Activity::log((int)$user['id'], $projectId, null, 'project_created', ['title' => $data['title']]);
        Response::success(['id' => $projectId], 'Project created', 201);
    }

    public function update(int $id): void
    {
        $user = Auth::requireRoles(['supervisor', 'team_leader']);
        Auth::requireProjectManager($id, $user);
        $this->projectExists($id);
        $data = Request::json();

        $fields = [];
        $params = [];
        if (array_key_exists('title', $data)) {
            if (trim((string)$data['title']) === '') Response::error('Project title cannot be empty', 422);
            $fields[] = 'title = ?';
            $params[] = trim((string)$data['title']);
        }
        if (array_key_exists('description', $data)) {
            $fields[] = 'description = ?';
            $params[] = trim((string)$data['description']) ?: null;
        }
        if (array_key_exists('status', $data)) {
            $fields[] = 'status = ?';
            $params[] = Request::enum((string)$data['status'], ['planned', 'in_progress', 'completed', 'archived'], 'status');
        }
        if (array_key_exists('supervisor_id', $data) && $user['role'] === 'supervisor') {
            $fields[] = 'supervisor_id = ?';
            $params[] = Request::value($data, 'supervisor_id') ?: null;
        }
        if (array_key_exists('leader_id', $data)) {
            $fields[] = 'leader_id = ?';
            $params[] = Request::value($data, 'leader_id') ?: null;
        }
        if (array_key_exists('start_date', $data)) {
            $fields[] = 'start_date = ?';
            $params[] = Request::dateOrNull($data['start_date'], 'start_date');
        }
        if (array_key_exists('end_date', $data)) {
            $fields[] = 'end_date = ?';
            $params[] = Request::dateOrNull($data['end_date'], 'end_date');
        }

        if (!$fields) {
            Response::success(['id' => $id], 'No changes');
        }
        $params[] = $id;
        $stmt = Database::connect()->prepare('UPDATE projects SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);
        Activity::log((int)$user['id'], $id, null, 'project_updated', $data);
        Response::success(['id' => $id], 'Project updated');
    }

    public function delete(int $id): void
    {
        $user = Auth::requireRoles(['supervisor', 'team_leader']);
        Auth::requireProjectManager($id, $user);
        $this->projectExists($id);
        Activity::log((int)$user['id'], $id, null, 'project_deleted');
        $stmt = Database::connect()->prepare('DELETE FROM projects WHERE id = ?');
        $stmt->execute([$id]);
        Response::success([], 'Project deleted');
    }

    public function addMember(int $projectId): void
    {
        $user = Auth::requireRoles(['supervisor', 'team_leader']);
        Auth::requireProjectManager($projectId, $user);
        $data = Request::json();
        Request::required($data, ['user_id']);

        $memberId = (int)$data['user_id'];
        $roleInProject = Request::enum(Request::value($data, 'role_in_project', 'member'), ['leader', 'member'], 'role_in_project');

        $userStmt = Database::connect()->prepare('SELECT id, role FROM users WHERE id = ? LIMIT 1');
        $userStmt->execute([$memberId]);
        $targetUser = $userStmt->fetch();
        if (!$targetUser) {
            Response::error('User not found', 404);
        }
        if (!in_array($targetUser['role'], ['team_leader', 'student'], true)) {
            Response::error('Only team leaders and students can be added as project members', 422);
        }
        if ($roleInProject === 'leader' && $targetUser['role'] !== 'team_leader') {
            Response::error('Only users with the Team Leader role can be assigned as project leader', 422);
        }

        $stmt = Database::connect()->prepare('INSERT INTO project_members (project_id, user_id, role_in_project) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role_in_project = VALUES(role_in_project)');
        $stmt->execute([$projectId, $memberId, $roleInProject]);
        if ($roleInProject === 'leader') {
            $update = Database::connect()->prepare('UPDATE projects SET leader_id = ? WHERE id = ?');
            $update->execute([$memberId, $projectId]);
        }
        Activity::log((int)$user['id'], $projectId, null, 'member_added', ['user_id' => $memberId, 'role_in_project' => $roleInProject]);
        Response::success([], 'Member added');
    }

    public function removeMember(int $projectId, int $userId): void
    {
        $user = Auth::requireRoles(['supervisor', 'team_leader']);
        Auth::requireProjectManager($projectId, $user);
        if ((int)$user['id'] === $userId && $user['role'] === 'team_leader') {
            Response::error('Team leaders cannot remove themselves from their own project', 422);
        }
        $stmt = Database::connect()->prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?');
        $stmt->execute([$projectId, $userId]);
        $leaderStmt = Database::connect()->prepare('UPDATE projects SET leader_id = NULL WHERE id = ? AND leader_id = ?');
        $leaderStmt->execute([$projectId, $userId]);
        Activity::log((int)$user['id'], $projectId, null, 'member_removed', ['user_id' => $userId]);
        Response::success([], 'Member removed');
    }
}
