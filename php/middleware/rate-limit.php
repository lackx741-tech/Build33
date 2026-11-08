<?php

declare(strict_types=1);

namespace Blower\Middleware;

use Blower\Support\HttpException;

/**
 * Fixed-window rate limiter backed by one temp file per client key. Suitable
 * for a single PHP worker pool; replace with a shared store (Redis) when
 * running many front-ends.
 */
final class RateLimit
{
    public function __construct(
        private readonly int $windowSeconds,
        private readonly int $maxRequests,
        private readonly ?string $storageDir = null,
    ) {
    }

    public function handle(string $clientKey): void
    {
        $dir = $this->storageDir ?? sys_get_temp_dir() . '/blower-ratelimit';
        if (!is_dir($dir)) {
            @mkdir($dir, 0700, true);
        }

        $file = $dir . '/' . hash('sha256', $clientKey) . '.json';
        $now = time();
        $entry = ['count' => 0, 'reset' => $now + $this->windowSeconds];

        if (is_file($file)) {
            $raw = file_get_contents($file);
            $decoded = $raw !== false ? json_decode($raw, true) : null;
            if (is_array($decoded) && ($decoded['reset'] ?? 0) > $now) {
                $entry = $decoded;
            }
        }

        $entry['count']++;
        $remaining = max(0, $this->maxRequests - $entry['count']);

        header('X-RateLimit-Limit: ' . $this->maxRequests);
        header('X-RateLimit-Remaining: ' . $remaining);
        header('X-RateLimit-Reset: ' . $entry['reset']);

        if ($entry['count'] > $this->maxRequests) {
            header('Retry-After: ' . max(0, $entry['reset'] - $now));
            throw new HttpException('Rate limit exceeded', 429, 'rate_limited');
        }

        file_put_contents($file, json_encode($entry), LOCK_EX);
    }
}
