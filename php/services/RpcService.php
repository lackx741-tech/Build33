<?php

declare(strict_types=1);

namespace Blower\Services;

use Blower\Config\AppConfig;
use Blower\Support\HttpException;
use Blower\Support\Logger;

/**
 * JSON-RPC gateway. Forwards validated calls to the configured upstream
 * provider for the requested network. The upstream URL is resolved from
 * configuration only, so a caller can never redirect the proxy.
 */
final class RpcService
{
    public function __construct(
        private readonly AppConfig $config,
        private readonly HttpService $http,
    ) {
    }

    public function networkFor(?string $requested): string
    {
        $network = $requested !== null && $requested !== '' ? $requested : 'bsc';
        if ($this->config->rpcUrl($network) === null) {
            throw new HttpException("Unsupported network: {$network}", 400, 'bad_request');
        }
        return $network;
    }

    /**
     * @param array<int, array<string, mixed>> $calls
     * @return array<string, mixed> upstream response body
     */
    public function forward(array $calls, string $network, bool $batched): array
    {
        $url = $this->config->rpcUrl($network);
        if ($url === null) {
            throw new HttpException("No RPC URL configured for {$network}", 500, 'internal_error');
        }

        $payload = $batched ? array_values($calls) : $calls[0];

        $response = $this->http->postJson($url, $payload);
        Logger::debug('rpc.forward', ['network' => $network, 'status' => $response['status']]);

        if ($response['status'] >= 400) {
            throw new HttpException('Upstream RPC returned an error', 502, 'upstream_error', [
                'status' => $response['status'],
            ]);
        }

        return is_array($response['body']) ? $response['body'] : ['raw' => $response['body']];
    }

    /** Health probe: request the chain id from the configured provider. */
    public function chainId(string $network): ?int
    {
        $url = $this->config->rpcUrl($network);
        if ($url === null) {
            return null;
        }
        try {
            $response = $this->http->postJson($url, [
                'jsonrpc' => '2.0',
                'id' => 1,
                'method' => 'eth_chainId',
                'params' => [],
            ]);
            $result = is_array($response['body']) ? ($response['body']['result'] ?? null) : null;
            return is_string($result) ? (int) hexdec($result) : null;
        } catch (\Throwable $e) {
            Logger::warn('rpc.chainId probe failed', ['network' => $network, 'error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Estimate gas for a transaction object via eth_estimateGas.
     *
     * @param array<string, mixed> $tx
     */
    public function estimateGas(array $tx, string $network): mixed
    {
        $response = $this->forward([[
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => 'eth_estimateGas',
            'params' => [$tx],
        ]], $network, false);

        return $response['result'] ?? null;
    }
}
