<?php

class Request
{
    public static function json(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === '' || $raw === false) {
            return [];
        }

        $data = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Response::error('Invalid JSON body', 400);
        }

        return is_array($data) ? $data : [];
    }

    public static function required(array $data, array $fields): void
    {
        foreach ($fields as $field) {
            if (!isset($data[$field]) || trim((string)$data[$field]) === '') {
                Response::error("Field '{$field}' is required", 422);
            }
        }
    }

    public static function value(array $data, string $key, $default = null)
    {
        return array_key_exists($key, $data) ? $data[$key] : $default;
    }

    public static function enum(?string $value, array $allowed, string $field): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!in_array($value, $allowed, true)) {
            Response::error("Invalid {$field}", 422, ['allowed' => $allowed]);
        }
        return $value;
    }

    public static function dateOrNull($value, string $field): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $date = DateTime::createFromFormat('Y-m-d', (string)$value);
        if (!$date || $date->format('Y-m-d') !== $value) {
            Response::error("Invalid {$field}. Expected YYYY-MM-DD", 422);
        }
        return $value;
    }
}
