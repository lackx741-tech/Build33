<?php

declare(strict_types=1);

namespace Blower\Services;

use Blower\Config\AppConfig;
use Blower\Support\HttpException;

/**
 * Read-only contract helper.
 *
 * Encoding a function selector requires Keccak-256, which PHP does not provide
 * in its standard hash extension (SHA3-256 is a different algorithm). Rather
 * than hand-roll cryptography in this gateway, contract reads are served two
 * ways:
 *
 *   1. The caller supplies already-encoded calldata (`data`) and the gateway
 *      performs a plain eth_call. This is the transparent path.
 *   2. The caller supplies `method` + `params` + `abi`; the gateway delegates
 *      the encoding to the Node service (`NODE_API_URL`), which owns the ABI
 *      layer. Without that configuration the request is rejected with a clear
 *      message instead of silently producing a wrong selector.
 *
 * State-changing methods are never executed by this service.
 */
final class ContractService
{
    public function __construct(
        private readonly RpcService $rpc,
        private readonly HttpService $http,
        private readonly AppConfig $config,
    ) {
    }

    /**
     * @param array<string, mixed> $body validated contract-read payload
     * @return array<string, mixed>
     */
    public function read(array $body, string $network): array
    {
        $address = (string) $body['address'];

        if (!empty($body['data'])) {
            return [
                'address' => $address,
                'network' => $network,
                'result' => $this->call($address, (string) $body['data'], $network),
            ];
        }

        $this->assertViewMethod($body);

        $nodeUrl = $this->config->get('node_api_url');
        if ($nodeUrl === null) {
            throw new HttpException(
                'ABI encoding requires the Node gateway; supply pre-encoded "data" or set NODE_API_URL',
                501,
                'not_implemented',
            );
        }

        $response = $this->http->postJson(rtrim((string) $nodeUrl, '/') . '/api/contracts/read', $body);
        if (($response['status'] ?? 500) >= 400 || !is_array($response['body'])) {
            throw new HttpException('Node gateway contract read failed', 502, 'upstream_error');
        }

        return $response['body']['data'] ?? $response['body'];
    }

    private function call(string $address, string $data, string $network): mixed
    {
        $response = $this->rpc->forward([[
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => 'eth_call',
            'params' => [['to' => $address, 'data' => $data], 'latest'],
        ]], $network, false);

        return $response['result'] ?? null;
    }

    /** @param array<string, mixed> $body */
    private function assertViewMethod(array $body): void
    {
        $abi = $body['abi'] ?? [];
        $method = $body['method'] ?? null;
        if (!is_array($abi) || !is_string($method)) {
            throw new HttpException('abi and method are required when "data" is not supplied', 400, 'bad_request');
        }

        foreach ($abi as $entry) {
            if (($entry['type'] ?? '') !== 'function' || ($entry['name'] ?? '') !== $method) {
                continue;
            }
            $mutability = $entry['stateMutability'] ?? 'nonpayable';
            if (!in_array($mutability, ['view', 'pure'], true)) {
                throw new HttpException(
                    "Method {$method} is state-changing and cannot be called via contracts/read",
                    400,
                    'bad_request',
                );
            }
            return;
        }

        throw new HttpException("Method not found in ABI: {$method}", 400, 'bad_request');
    }
}
