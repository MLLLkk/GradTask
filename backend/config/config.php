<?php

function env_value(string $key, $default = null)
{
    $value = getenv($key);
    return $value === false ? $default : $value;
}

define('DB_HOST', env_value('GRADTASK_DB_HOST', '127.0.0.1'));
define('DB_PORT', env_value('GRADTASK_DB_PORT', '3306'));
define('DB_NAME', env_value('GRADTASK_DB_NAME', 'gradtask'));
define('DB_USER', env_value('GRADTASK_DB_USER', 'root'));
define('DB_PASS', env_value('GRADTASK_DB_PASS', ''));
define('DB_CHARSET', env_value('GRADTASK_DB_CHARSET', 'utf8mb4'));

define('JWT_SECRET', env_value('GRADTASK_JWT_SECRET', 'change-this-secret-in-production'));
define('JWT_EXP_SECONDS', 60 * 60 * 24);

define('ALLOWED_ORIGIN', env_value('GRADTASK_ALLOWED_ORIGIN', 'http://localhost:5173'));
define('UPLOAD_DIR', dirname(__DIR__) . '/storage/uploads');
define('MAX_UPLOAD_SIZE', 10 * 1024 * 1024);
define('APP_DEBUG', env_value('GRADTASK_DEBUG', 'true') === 'true');
