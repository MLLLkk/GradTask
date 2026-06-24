<?php

class TaskController
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

    private function taskProjectId(int $taskId): int
    {
        $stmt = Database::connect()->prepare('SELECT project_id FROM tasks WHERE id = ?');
        $stmt->execute([$taskId]);
        $projectId = $stmt->fetchColumn();
        if (!$projectId) {
            Response::error('Task not found', 404);
        }
        return (int)$projectId;
    }

    private function ensureAssigneeInProject(?int $assigneeId, int $projectId): void
    {
        if ($assigneeId === null) {
            return;
        }
        $stmt = Database::connect()->prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ? LIMIT 1');
        $stmt->execute([$projectId, $assigneeId]);
        if (!$stmt->fetchColumn()) {
            Response::error('Assigned user must be a member of this project', 422);
        }
    }

    public function byProject(int $projectId): void
    {
        $user = Auth::user();
        Auth::ensureProjectAccess($projectId, $user);

        $status = trim($_GET['status'] ?? '');
        $assignedTo = trim($_GET['assigned_to'] ?? '');
        $search = trim($_GET['search'] ?? '');
        $where = ['t.project_id = ?'];
        $params = [$projectId];

        if ($status !== '') {
            Request::enum($status, ['pending', 'in_progress', 'completed'], 'status');
            $where[] = 't.status = ?';
            $params[] = $status;
        }
        if ($assignedTo !== '') {
            $where[] = 't.assigned_to = ?';
            $params[] = (int)$assignedTo;
        }
        if ($search !== '') {
            $where[] = '(t.title LIKE ? OR t.description LIKE ? OR u.name LIKE ?)';
            array_push($params, "%$search%", "%$search%", "%$search%");
        }

        $stmt = Database::connect()->prepare('SELECT t.*, u.name assigned_name, creator.name created_by_name FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to LEFT JOIN users creator ON creator.id = t.created_by WHERE ' . implode(' AND ', $where) . ' ORDER BY t.due_date IS NULL, t.due_date ASC, FIELD(t.priority, "high", "medium", "low")');
        $stmt->execute($params);
        Response::success($stmt->fetchAll());
    }

    public function create(): void
    {
        $user = Auth::requireRoles(['supervisor', 'team_leader']);
        $data = Request::json();
        Request::required($data, ['project_id', 'title']);
        $projectId = (int)$data['project_id'];
        Auth::requireProjectManager($projectId, $user);

        $assignedTo = Request::value($data, 'assigned_to') ? (int)$data['assigned_to'] : null;
        $this->ensureAssigneeInProject($assignedTo, $projectId);

        $db = Database::connect();
        $stmt = $db->prepare('INSERT INTO tasks (project_id, title, description, assigned_to, created_by, priority, status, due_date, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $status = Request::enum(Request::value($data, 'status', 'pending'), ['pending', 'in_progress', 'completed'], 'status');
        $completedAt = $status === 'completed' ? date('Y-m-d H:i:s') : null;
        $stmt->execute([
            $projectId,
            trim($data['title']),
            Request::value($data, 'description') ? trim((string)$data['description']) : null,
            $assignedTo,
            $user['id'],
            Request::enum(Request::value($data, 'priority', 'medium'), ['low', 'medium', 'high'], 'priority'),
            $status,
            Request::dateOrNull(Request::value($data, 'due_date'), 'due_date'),
            $completedAt,
        ]);
        $taskId = (int)$db->lastInsertId();
        $this->recalculateProgress($projectId);
        Activity::log((int)$user['id'], $projectId, $taskId, 'task_created', ['title' => $data['title']]);
        Response::success(['id' => $taskId], 'Task created', 201);
    }

    public function update(int $id): void
    {
        $user = Auth::user();
        $projectId = $this->taskProjectId($id);
        Auth::ensureProjectAccess($projectId, $user);

        $currentStmt = Database::connect()->prepare('SELECT * FROM tasks WHERE id = ?');
        $currentStmt->execute([$id]);
        $current = $currentStmt->fetch();
        if (!$current) {
            Response::error('Task not found', 404);
        }

        $data = Request::json();
        $canEditFull = Auth::isProjectManager($projectId, $user);
        $isAssignee = (int)($current['assigned_to'] ?? 0) === (int)$user['id'];

        if (!$canEditFull && !$isAssignee) {
            Response::error('Students can only update their assigned tasks', 403);
        }

        $newStatus = Request::enum(Request::value($data, 'status', $current['status']), ['pending', 'in_progress', 'completed'], 'status');
        $completedAt = $current['completed_at'];
        if ($newStatus === 'completed' && $current['status'] !== 'completed') {
            $completedAt = date('Y-m-d H:i:s');
        } elseif ($newStatus !== 'completed') {
            $completedAt = null;
        }

        $assignedTo = $current['assigned_to'];
        if ($canEditFull && array_key_exists('assigned_to', $data)) {
            $assignedTo = Request::value($data, 'assigned_to') ? (int)$data['assigned_to'] : null;
            $this->ensureAssigneeInProject($assignedTo, $projectId);
        }

        $stmt = Database::connect()->prepare('UPDATE tasks SET title = ?, description = ?, assigned_to = ?, priority = ?, status = ?, due_date = ?, completed_at = ? WHERE id = ?');
        $stmt->execute([
            $canEditFull ? trim((string)Request::value($data, 'title', $current['title'])) : $current['title'],
            $canEditFull ? (Request::value($data, 'description', $current['description']) ?: null) : $current['description'],
            $assignedTo,
            $canEditFull ? Request::enum(Request::value($data, 'priority', $current['priority']), ['low', 'medium', 'high'], 'priority') : $current['priority'],
            $newStatus,
            $canEditFull ? Request::dateOrNull(Request::value($data, 'due_date', $current['due_date']), 'due_date') : $current['due_date'],
            $completedAt,
            $id,
        ]);

        $this->recalculateProgress($projectId);
        Activity::log((int)$user['id'], $projectId, $id, 'task_updated', $data);
        Response::success(['id' => $id], 'Task updated');
    }

    public function delete(int $id): void
    {
        $user = Auth::requireRoles(['supervisor', 'team_leader']);
        $projectId = $this->taskProjectId($id);
        Auth::requireProjectManager($projectId, $user);
        Activity::log((int)$user['id'], $projectId, $id, 'task_deleted');
        $stmt = Database::connect()->prepare('DELETE FROM tasks WHERE id = ?');
        $stmt->execute([$id]);
        $this->recalculateProgress($projectId);
        Response::success([], 'Task deleted');
    }
}
