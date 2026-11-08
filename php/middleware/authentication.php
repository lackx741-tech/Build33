<?php

declare(strict_types=1);

namespace Blower\Middleware;

use Blower\Config\AppConfig;
use Blower\Support\HttpException;
use Blower\Support\Logger;
use Blower\Support\Request;

/**
 * API-key authentication. When no key is configured the middleware is a no-op
 * (development only). The key is compared in constant time.
 */
final class Authentication
{
    public function __construct(private readonly AppConfig $config)
    {
    }

    public function handle(): void
    {
        if (!$this->config->authRequired()) {
            Logger::warn('authentication disabled: PHP_API_KEY is not set');
            return;
        }

        $provided = Request::header('X-API-Key');
        if ($provided === null) {
            $auth = Request::header('Authorization') ?? '';
            if (stripos($auth, 'Bearer ') === 0) {
                $provided = trim(substr($auth, 7));
            }
        }

        if ($provided === null || !hash_equals($this->config->apiKey(), $provided)) {
            throw new HttpException('Invalid or missing API key', 401, 'unauthorized');
        }
    }
}
