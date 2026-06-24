<?php

class ReportController
{
    public function project(int $projectId): void
    {
        $user = Auth::user();
        Auth::ensureProjectAccess($projectId, $user);
        $db = Database::connect();

        $projectStmt = $db->prepare('SELECT p.*, s.name supervisor_name, l.name leader_name FROM projects p LEFT JOIN users s ON s.id = p.supervisor_id LEFT JOIN users l ON l.id = p.leader_id WHERE p.id = ?');
        $projectStmt->execute([$projectId]);
        $project = $projectStmt->fetch();
        if (!$project) {
            Response::error('Project not found', 404);
        }

        $tasksStmt = $db->prepare('SELECT t.*, u.name assigned_name FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to WHERE t.project_id = ? ORDER BY FIELD(t.priority, "high", "medium", "low"), t.due_date ASC');
        $tasksStmt->execute([$projectId]);

        $membersStmt = $db->prepare('SELECT u.id, u.name, u.email, pm.role_in_project,
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
            GROUP BY u.id, u.name, u.email, pm.role_in_project
            ORDER BY contribution_score DESC');
        $membersStmt->execute([$projectId, $projectId, $projectId]);

        $summaryStmt = $db->prepare('SELECT COUNT(*) total_tasks, COALESCE(SUM(status = "completed"),0) completed_tasks, COALESCE(SUM(status = "pending"),0) pending_tasks, COALESCE(SUM(status = "in_progress"),0) in_progress_tasks, COALESCE(SUM(status != "completed" AND due_date IS NOT NULL AND due_date < CURDATE()),0) overdue_tasks FROM tasks WHERE project_id = ?');
        $summaryStmt->execute([$projectId]);

        Response::success([
            'generated_at' => date('Y-m-d H:i:s'),
            'project' => $project,
            'summary' => $summaryStmt->fetch(),
            'members' => $membersStmt->fetchAll(),
            'tasks' => $tasksStmt->fetchAll(),
        ]);
    }
}
