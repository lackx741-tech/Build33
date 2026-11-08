<?php

declare(strict_types=1);

namespace Blower\Support;

/**
 * Response helper. Produces the same JSON envelope as the Node service so the
 * frontend can consume either gateway interchangeably.
 */
final class Response
{
    public static function json(array $payload, int $status = 200, array $headers = []): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: no-referrer');
        header('X-Frame-Options: DENY');
        foreach ($headers as $name => $value) {
            header("{$name}: {$value}");
        }
        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    public static function ok(array $data, int $status = 200): void
    {
        self::json(['ok' => true, 'data' => $data], $status);
    }

    public static function error(string $message, string $code = 'internal_error', int $status = 500, array $details = []): void
    {
        $error = ['code' => $code, 'message' => $message];
        if ($details !== []) {
            $error['details'] = $details;
        }
        self::json(['ok' => false, 'error' => $error], $status);
    }

    public static function fromException(\Throwable $e): void
    {
        if ($e instanceof HttpException) {
            self::error($e->getMessage(), $e->errorCode(), $e->status(), $e->details());
            return;
        }
        Logger::error('unhandled exception', ['message' => $e->getMessage()]);
        self::error('Internal server error', 'internal_error', 500);
    }
}
