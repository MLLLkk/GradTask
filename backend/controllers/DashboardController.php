<?php

class DashboardController
{
    public function stats(): void
    {
        $user = Auth::user();
        $db = Database::connect();

        $projectWhere = '';
        $params = [];
        if ($user['role'] !== 'supervisor') {
            $projectWhere = 'WHERE p.id IN (SELECT project_id FROM project_members WHERE user_id = ?) OR p.leader_id = ? OR p.supervisor_id = ?';
            $params = [$user['id'], $user['id'], $user['id']];
        }

        $projects = $db->prepare("SELECT COUNT(*) FROM projects p $projectWhere");
        $projects->execute($params);
        $totalProjects = (int)$projects->fetchColumn();

        $taskFilter = $user['role'] === 'supervisor'
            ? ''
            : 'WHERE t.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?) OR t.assigned_to = ?';
        $taskParams = $user['role'] === 'supervisor' ? [] : [$user['id'], $user['id']];

        $tasks = $db->prepare("SELECT COUNT(*) total,
            COALESCE(SUM(status = 'completed'), 0) completed,
            COALESCE(SUM(status = 'pending'), 0) pending,
            COALESCE(SUM(status = 'in_progress'), 0) in_progress,
            COALESCE(SUM(status != 'completed' AND due_date IS NOT NULL AND due_date < CURDATE()), 0) overdue
            FROM tasks t $taskFilter");
        $tasks->execute($taskParams);
        $taskStats = $tasks->fetch() ?: [];

        $priorityStmt = $db->prepare("SELECT priority, COUNT(*) total FROM tasks t $taskFilter GROUP BY priority");
        $priorityStmt->execute($taskParams);
        $priorities = $priorityStmt->fetchAll();

        $recent = $db->prepare("SELECT al.action, al.created_at, u.name user_name, p.title project_title, t.title task_title
            FROM activity_logs al
            LEFT JOIN users u ON u.id = al.user_id
            LEFT JOIN projects p ON p.id = al.project_id
            LEFT JOIN tasks t ON t.id = al.task_id
            " . ($user['role'] === 'supervisor' ? '' : 'WHERE al.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)') . "
            ORDER BY al.created_at DESC LIMIT 10");
        $recent->execute($user['role'] === 'supervisor' ? [] : [$user['id']]);

        if ($user['role'] === 'supervisor') {
            $contributionSql = "SELECT u.id, u.name, u.email,
                COALESCE(SUM(CASE WHEN t.status = 'completed' THEN CASE t.priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END ELSE 0 END), 0)
                + COALESCE(SUM(CASE WHEN t.status = 'completed' AND t.completed_at IS NOT NULL AND t.due_date IS NOT NULL AND DATE(t.completed_at) <= t.due_date THEN 1 ELSE 0 END), 0)
                + COALESCE((SELECT COUNT(*) * 0.5 FROM comments c WHERE c.user_id = u.id), 0)
                + COALESCE((SELECT COUNT(*) * 0.25 FROM activity_logs al2 WHERE al2.user_id = u.id AND al2.action LIKE 'task_%'), 0)
                AS score,
                COUNT(t.id) assigned_tasks,
                COALESCE(SUM(t.status = 'completed'), 0) completed_tasks
                FROM users u
                LEFT JOIN tasks t ON t.assigned_to = u.id
                WHERE u.role IN ('student','team_leader')
                GROUP BY u.id, u.name, u.email
                ORDER BY score DESC LIMIT 8";
            $contributions = $db->query($contributionSql)->fetchAll();
        } else {
            $contributionStmt = $db->prepare("SELECT u.id, u.name, u.email,
                COALESCE(SUM(CASE WHEN t.status = 'completed' THEN CASE t.priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END ELSE 0 END), 0)
                + COALESCE(SUM(CASE WHEN t.status = 'completed' AND t.completed_at IS NOT NULL AND t.due_date IS NOT NULL AND DATE(t.completed_at) <= t.due_date THEN 1 ELSE 0 END), 0)
                + COALESCE((SELECT COUNT(*) * 0.5 FROM comments c JOIN tasks ct ON ct.id = c.task_id WHERE c.user_id = u.id AND ct.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)), 0)
                + COALESCE((SELECT COUNT(*) * 0.25 FROM activity_logs al2 WHERE al2.user_id = u.id AND al2.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?) AND al2.action LIKE 'task_%'), 0)
                AS score,
                COUNT(t.id) assigned_tasks,
                COALESCE(SUM(t.status = 'completed'), 0) completed_tasks
                FROM users u
                JOIN project_members pm ON pm.user_id = u.id
                LEFT JOIN tasks t ON t.assigned_to = u.id AND t.project_id = pm.project_id
                WHERE pm.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)
                GROUP BY u.id, u.name, u.email
                ORDER BY score DESC LIMIT 8");
            $contributionStmt->execute([$user['id'], $user['id'], $user['id']]);
            $contributions = $contributionStmt->fetchAll();
        }

        Response::success([
            'cards' => [
                'total_projects' => $totalProjects,
                'total_tasks' => (int)($taskStats['total'] ?? 0),
                'completed_tasks' => (int)($taskStats['completed'] ?? 0),
                'pending_tasks' => (int)($taskStats['pending'] ?? 0),
                'in_progress_tasks' => (int)($taskStats['in_progress'] ?? 0),
                'overdue_tasks' => (int)($taskStats['overdue'] ?? 0),
            ],
            'priorities' => $priorities,
            'recent_activity' => $recent->fetchAll(),
            'contributions' => $contributions,
        ]);
    }
}
