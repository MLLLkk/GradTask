<?php

class Activity
{
    public static function log(?int $userId, ?int $projectId, ?int $taskId, string $action, array $details = []): void
    {
        try {
            $db = Database::connect();
            $stmt = $db->prepare('INSERT INTO activity_logs (user_id, project_id, task_id, action, details) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([$userId, $projectId, $taskId, $action, json_encode($details, JSON_UNESCAPED_UNICODE)]);
        } catch (Throwable $e) {
            // Activity logging must never break the user flow.
        }
    }
}
