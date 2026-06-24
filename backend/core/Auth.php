<?php

class Auth
{
    public static function user(): array
    {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            Response::error('Missing bearer token', 401);
        }

        try {
            $payload = JWT::decode(trim($matches[1]));
            $db = Database::connect();
            $stmt = $db->prepare('SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ? LIMIT 1');
            $stmt->execute([$payload['sub']]);
            $user = $stmt->fetch();
            if (!$user) {
                Response::error('User not found', 401);
            }
            return $user;
        } catch (Throwable $e) {
            Response::error('Unauthorized: ' . $e->getMessage(), 401);
        }
    }

    public static function requireRoles(array $roles): array
    {
        $user = self::user();
        if (!in_array($user['role'], $roles, true)) {
            Response::error('Forbidden for this role', 403);
        }
        return $user;
    }

    public static function isProjectMember(int $projectId, int $userId): bool
    {
        $db = Database::connect();
        $stmt = $db->prepare('SELECT 1 FROM projects p LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ? WHERE p.id = ? AND (p.supervisor_id = ? OR p.leader_id = ? OR pm.user_id IS NOT NULL) LIMIT 1');
        $stmt->execute([$userId, $projectId, $userId, $userId]);
        return (bool)$stmt->fetchColumn();
    }

    public static function isProjectManager(int $projectId, array $user): bool
    {
        if ($user['role'] === 'supervisor') {
            return true;
        }
        if ($user['role'] !== 'team_leader') {
            return false;
        }

        $db = Database::connect();
        $stmt = $db->prepare('SELECT 1 FROM projects p LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ? WHERE p.id = ? AND (p.leader_id = ? OR pm.role_in_project = "leader") LIMIT 1');
        $stmt->execute([$user['id'], $projectId, $user['id']]);
        return (bool)$stmt->fetchColumn();
    }

    public static function ensureProjectAccess(int $projectId, array $user): void
    {
        if ($user['role'] === 'supervisor') {
            return;
        }
        if (!self::isProjectMember($projectId, (int)$user['id'])) {
            Response::error('You do not have access to this project', 403);
        }
    }

    public static function requireProjectManager(int $projectId, array $user): void
    {
        self::ensureProjectAccess($projectId, $user);
        if (!self::isProjectManager($projectId, $user)) {
            Response::error('Only the project supervisor or team leader can perform this action', 403);
        }
    }
}
