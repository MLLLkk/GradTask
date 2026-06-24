<?php

class UserController
{
    public function index(): void
    {
        Auth::user();
        $role = trim($_GET['role'] ?? '');
        $search = trim($_GET['search'] ?? '');

        $where = [];
        $params = [];
        if ($role !== '') {
            Request::enum($role, ['supervisor', 'team_leader', 'student'], 'role');
            $where[] = 'role = ?';
            $params[] = $role;
        }
        if ($search !== '') {
            $where[] = '(name LIKE ? OR email LIKE ?)';
            array_push($params, "%$search%", "%$search%");
        }
        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $stmt = Database::connect()->prepare("SELECT id, name, email, role, avatar_url FROM users {$whereSql} ORDER BY role, name");
        $stmt->execute($params);
        Response::success($stmt->fetchAll());
    }
}
