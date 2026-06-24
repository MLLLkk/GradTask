<?php

class CommentController
{
    private function projectIdFromTask(int $taskId): int
    {
        $stmt = Database::connect()->prepare('SELECT project_id FROM tasks WHERE id = ?');
        $stmt->execute([$taskId]);
        $projectId = $stmt->fetchColumn();
        if (!$projectId) {
            Response::error('Task not found', 404);
        }
        return (int)$projectId;
    }

    public function index(int $taskId): void
    {
        $user = Auth::user();
        $projectId = $this->projectIdFromTask($taskId);
        Auth::ensureProjectAccess($projectId, $user);

        $stmt = Database::connect()->prepare('SELECT c.*, u.name user_name, u.role user_role FROM comments c JOIN users u ON u.id = c.user_id WHERE c.task_id = ? ORDER BY c.created_at ASC');
        $stmt->execute([$taskId]);
        Response::success($stmt->fetchAll());
    }

    public function create(int $taskId): void
    {
        $user = Auth::user();
        $projectId = $this->projectIdFromTask($taskId);
        Auth::ensureProjectAccess($projectId, $user);
        $data = Request::json();
        Request::required($data, ['comment']);

        $stmt = Database::connect()->prepare('INSERT INTO comments (task_id, user_id, comment) VALUES (?, ?, ?)');
        $stmt->execute([$taskId, $user['id'], $data['comment']]);
        Activity::log((int)$user['id'], $projectId, $taskId, 'comment_added', ['comment' => mb_substr($data['comment'], 0, 120)]);
        Response::success(['id' => (int)Database::connect()->lastInsertId()], 'Comment added', 201);
    }
}
