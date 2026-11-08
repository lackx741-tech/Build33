<?php

declare(strict_types=1);

namespace Blower\Support;

use Blower\Config\AppConfig;
use Blower\Middleware\Authentication;
use Blower\Middleware\RateLimit;

/**
 * Tiny path router. Routes register a method + literal path and receive a
 * request context. Authentication, rate limiting, CORS and JSON parsing are
 * applied centrally so individual handlers cannot forget them.
 */
final class Router
{
    /** @var array<string, callable> */
    private array $routes = [];

    /** Paths that bypass API-key authentication (probed by orchestrators). */
    private const PUBLIC_PATHS = ['/api/health', '/api/networks'];

    public function __construct(
        private readonly AppConfig $config,
        private readonly Authentication $auth,
        private readonly RateLimit $rateLimit,
    ) {
    }

    public function add(string $method, string $path, callable $handler): void
    {
        $this->routes[strtoupper($method) . ' ' . $path] = $handler;
    }

    public function dispatch(string $method, string $path): void
    {
        $method = strtoupper($method);
        $path = rtrim($path, '/') ?: '/';
        $handler = $this->routes[$method . ' ' . $path] ?? null;

        try {
            $this->applyCors();

            if ($handler === null) {
                throw new HttpException("No route for {$method} {$path}", 404, 'not_found');
            }

            if (!in_array($path, self::PUBLIC_PATHS, true)) {
                $this->auth->handle();
            }

            $this->rateLimit->handle(Request::clientKey());

            header('X-Request-Id: ' . Request::requestId());

            $handler([
                'config' => $this->config,
                'body' => Request::json(),
                'method' => $method,
                'path' => $path,
            ]);
        } catch (\Throwable $e) {
            Response::fromException($e);
        }
    }

    private function applyCors(): void
    {
        $allowed = (array) $this->config->get('allowed_origins', []);
        $origin = Request::header('Origin');
        if ($origin !== null && in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
            header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, X-API-Key, X-Network, X-Chain-Id, Authorization');
        }
    }
}
