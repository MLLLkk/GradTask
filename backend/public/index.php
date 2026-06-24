<?php

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/JWT.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../utils/Request.php';
require_once __DIR__ . '/../utils/Activity.php';
require_once __DIR__ . '/../controllers/AuthController.php';
require_once __DIR__ . '/../controllers/UserController.php';
require_once __DIR__ . '/../controllers/DashboardController.php';
require_once __DIR__ . '/../controllers/ProjectController.php';
require_once __DIR__ . '/../controllers/TaskController.php';
require_once __DIR__ . '/../controllers/CommentController.php';
require_once __DIR__ . '/../controllers/FileController.php';
require_once __DIR__ . '/../controllers/ReportController.php';

$origin = $_SERVER['HTTP_ORIGIN'] ?? ALLOWED_ORIGIN;
$allowedOrigins = array_map('trim', explode(',', ALLOWED_ORIGIN));
if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: ' . $allowedOrigins[0]);
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = trim($path, '/');

try {
    if ($method === 'GET' && ($path === '' || $path === 'health')) {
        Response::success(['app' => 'GradTask API', 'status' => 'running']);
    }
    if ($method === 'POST' && $path === 'auth/login') {
        (new AuthController())->login();
    }
    if ($method === 'GET' && $path === 'auth/me') {
        (new AuthController())->me();
    }
    if ($method === 'GET' && $path === 'users') {
        (new UserController())->index();
    }
    if ($method === 'GET' && $path === 'dashboard/stats') {
        (new DashboardController())->stats();
    }

    if ($method === 'GET' && $path === 'projects') {
        (new ProjectController())->index();
    }
    if ($method === 'POST' && $path === 'projects') {
        (new ProjectController())->create();
    }
    if (preg_match('#^projects/(\d+)$#', $path, $m)) {
        if ($method === 'GET') (new ProjectController())->show((int)$m[1]);
        if ($method === 'PUT') (new ProjectController())->update((int)$m[1]);
        if ($method === 'DELETE') (new ProjectController())->delete((int)$m[1]);
    }
    if (preg_match('#^projects/(\d+)/members$#', $path, $m) && $method === 'POST') {
        (new ProjectController())->addMember((int)$m[1]);
    }
    if (preg_match('#^projects/(\d+)/members/(\d+)$#', $path, $m) && $method === 'DELETE') {
        (new ProjectController())->removeMember((int)$m[1], (int)$m[2]);
    }

    if (preg_match('#^projects/(\d+)/tasks$#', $path, $m) && $method === 'GET') {
        (new TaskController())->byProject((int)$m[1]);
    }
    if ($method === 'POST' && $path === 'tasks') {
        (new TaskController())->create();
    }
    if (preg_match('#^tasks/(\d+)$#', $path, $m)) {
        if ($method === 'PUT') (new TaskController())->update((int)$m[1]);
        if ($method === 'DELETE') (new TaskController())->delete((int)$m[1]);
    }

    if (preg_match('#^tasks/(\d+)/comments$#', $path, $m)) {
        if ($method === 'GET') (new CommentController())->index((int)$m[1]);
        if ($method === 'POST') (new CommentController())->create((int)$m[1]);
    }

    if (preg_match('#^projects/(\d+)/files$#', $path, $m) && $method === 'GET') {
        (new FileController())->byProject((int)$m[1]);
    }
    if ($method === 'POST' && $path === 'files/upload') {
        (new FileController())->upload();
    }
    if (preg_match('#^files/(\d+)/download$#', $path, $m) && $method === 'GET') {
        (new FileController())->download((int)$m[1]);
    }

    if (preg_match('#^reports/project/(\d+)$#', $path, $m) && $method === 'GET') {
        (new ReportController())->project((int)$m[1]);
    }

    Response::error('Route not found', 404, ['path' => $path, 'method' => $method]);
} catch (PDOException $e) {
    Response::error(APP_DEBUG ? 'Database error: ' . $e->getMessage() : 'Database error', 500);
} catch (Throwable $e) {
    Response::error(APP_DEBUG ? 'Server error: ' . $e->getMessage() : 'Server error', 500);
}
