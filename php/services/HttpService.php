<?php

declare(strict_types=1);

namespace Blower\Services;

use Blower\Support\HttpException;

/**
 * HTTP client for upstream JSON-RPC calls. cURL is used because it supports
 * explicit timeouts. The destination URL is always taken from configuration,
 * never from the request, which prevents SSRF.
 */
final class HttpService
{
    public function __construct(private readonly int $timeoutSeconds = 15)
    {
    }

    /**
     * POST a JSON body to a configured upstream URL.
     *
     * @param array<int, string> $headers
     * @return array{status: int, body: mixed}
     */
    public function postJson(string $url, mixed $payload, array $headers = []): array
    {
        $ch = curl_init($url);
        if ($ch === false) {
            throw new HttpException('Failed to initialize HTTP client', 500, 'internal_error');
        }

        $encoded = json_encode($payload, JSON_UNESCAPED_SLASHES);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $encoded,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => $this->timeoutSeconds,
            CURLOPT_TIMEOUT => $this->timeoutSeconds,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_HTTPHEADER => array_merge(
                ['Content-Type: application/json', 'Accept: application/json'],
                $headers,
            ),
        ]);

        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($body === false) {
            throw new HttpException('Upstream request failed', 502, 'upstream_error', ['reason' => $error]);
        }

        $decoded = json_decode((string) $body, true);

        return ['status' => $status, 'body' => $decoded ?? $body];
    }
}
