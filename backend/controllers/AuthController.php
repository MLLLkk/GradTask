<?php

class AuthController
{
    public function login(): void
    {
        $data = Request::json();
        Request::required($data, ['email', 'password']);

        $db = Database::connect();
        $stmt = $db->prepare('SELECT id, name, email, password_hash, role, avatar_url FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$data['email']]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($data['password'], $user['password_hash'])) {
            Response::error('Invalid email or password', 401);
        }

        $payload = [
            'sub' => (int)$user['id'],
            'role' => $user['role'],
            'iat' => time(),
            'exp' => time() + JWT_EXP_SECONDS,
        ];

        unset($user['password_hash']);
        Response::success([
            'token' => JWT::encode($payload),
            'user' => $user,
        ], 'Login successful');
    }

    public function me(): void
    {
        Response::success(Auth::user());
    }
}
