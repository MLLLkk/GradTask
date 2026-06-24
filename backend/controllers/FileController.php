<?php

class FileController
{
    private array $allowedMimes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip',
    ];

    public function byProject(int $projectId): void
    {
        $user = Auth::user();
        Auth::ensureProjectAccess($projectId, $user);
        $stmt = Database::connect()->prepare('SELECT f.*, u.name uploaded_by_name FROM files f JOIN users u ON u.id = f.uploaded_by WHERE f.project_id = ? ORDER BY f.created_at DESC');
        $stmt->execute([$projectId]);
        Response::success($stmt->fetchAll());
    }

    private function ensureTaskBelongsToProject(?int $taskId, int $projectId): void
    {
        if ($taskId === null) {
            return;
        }
        $stmt = Database::connect()->prepare('SELECT 1 FROM tasks WHERE id = ? AND project_id = ? LIMIT 1');
        $stmt->execute([$taskId, $projectId]);
        if (!$stmt->fetchColumn()) {
            Response::error('Task does not belong to the selected project', 422);
        }
    }

    public function upload(): void
    {
        $user = Auth::user();
        if (!isset($_POST['project_id'])) {
            Response::error('project_id is required', 422);
        }
        $projectId = (int)$_POST['project_id'];
        $taskId = isset($_POST['task_id']) && $_POST['task_id'] !== '' ? (int)$_POST['task_id'] : null;
        Auth::ensureProjectAccess($projectId, $user);
        $this->ensureTaskBelongsToProject($taskId, $projectId);

        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            Response::error('File upload failed', 422);
        }

        $file = $_FILES['file'];
        if ($file['size'] > MAX_UPLOAD_SIZE) {
            Response::error('File size exceeds 10MB limit', 422);
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']);
        if (!in_array($mime, $this->allowedMimes, true)) {
            Response::error('File type is not allowed', 422);
        }

        if (!is_dir(UPLOAD_DIR)) {
            mkdir(UPLOAD_DIR, 0775, true);
        }

        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $storedName = bin2hex(random_bytes(16)) . ($extension ? '.' . $extension : '');
        $destination = UPLOAD_DIR . '/' . $storedName;
        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            Response::error('Could not save uploaded file', 500);
        }

        $relativePath = 'storage/uploads/' . $storedName;
        $stmt = Database::connect()->prepare('INSERT INTO files (project_id, task_id, uploaded_by, original_name, stored_name, mime_type, size_bytes, path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$projectId, $taskId, $user['id'], $file['name'], $storedName, $mime, $file['size'], $relativePath]);
        Activity::log((int)$user['id'], $projectId, $taskId, 'file_uploaded', ['name' => $file['name']]);

        Response::success([
            'id' => (int)Database::connect()->lastInsertId(),
            'original_name' => $file['name'],
            'path' => $relativePath,
        ], 'File uploaded', 201);
    }

    public function download(int $fileId): void
    {
        $user = Auth::user();
        $stmt = Database::connect()->prepare('SELECT * FROM files WHERE id = ? LIMIT 1');
        $stmt->execute([$fileId]);
        $file = $stmt->fetch();
        if (!$file) {
            Response::error('File not found', 404);
        }
        Auth::ensureProjectAccess((int)$file['project_id'], $user);

        $path = UPLOAD_DIR . '/' . basename($file['stored_name']);
        if (!is_file($path)) {
            Response::error('File is missing from storage', 404);
        }

        header('Content-Type: ' . ($file['mime_type'] ?: 'application/octet-stream'));
        header('Content-Length: ' . filesize($path));
        header('Content-Disposition: attachment; filename="' . addslashes($file['original_name']) . '"');
        readfile($path);
        exit;
    }
}
