<?php

declare(strict_types=1);

namespace Blower\Support;

/** Accessors for the current HTTP request. Keeps $_SERVER handling in one place. */
final class Request
{
    public static function method(): string
    {
        return strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    }

    public static function path(): string
    {
        $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/';
        return rtrim($path, '/') ?: '/';
    }

    public static function header(string $name): ?string
    {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        $value = $_SERVER[$key] ?? null;
        return is_string($value) && $value !== '' ? $value : null;
    }

    /** Read and decode the JSON request body. */
    public static function json(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            return [];
        }
        $decoded = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new HttpException('Request body is not valid JSON', 400, 'bad_request');
        }
        return is_array($decoded) ? $decoded : ['value' => $decoded];
    }

    public static function query(string $key, ?string $default = null): ?string
    {
        $value = $_GET[$key] ?? null;
        return is_string($value) && $value !== '' ? $value : $default;
    }

    /** Best-effort client identity for rate limiting. */
    public static function clientKey(): string
    {
        $forwarded = self::header('X-Forwarded-For');
        if ($forwarded !== null) {
            return trim(explode(',', $forwarded)[0]);
        }
        return (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    }

    /** A per-request correlation id, echoed back for tracing. */
    public static function requestId(): string
    {
        static $id = null;
        if ($id === null) {
            $id = bin2hex(random_bytes(8));
        }
        return $id;
    }
}
