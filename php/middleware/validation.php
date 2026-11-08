<?php

declare(strict_types=1);

namespace Blower\Middleware;

use Blower\Support\HttpException;

/** Request validation shared by the RPC, contracts and transaction routes. */
final class Validation
{
    /** JSON-RPC methods the gateway is permitted to proxy. */
    public const ALLOWED_RPC_METHODS = [
        'eth_blockNumber',
        'eth_chainId',
        'eth_call',
        'eth_estimateGas',
        'eth_gasPrice',
        'eth_getBalance',
        'eth_getBlockByNumber',
        'eth_getCode',
        'eth_getLogs',
        'eth_getTransactionByHash',
        'eth_getTransactionCount',
        'eth_getTransactionReceipt',
        'eth_maxPriorityFeePerGas',
        'eth_sendRawTransaction',
        'net_version',
        'web3_clientVersion',
    ];

    public const MAX_BATCH = 20;

    public static function isAddress(mixed $value): bool
    {
        return is_string($value) && preg_match('/^0x[a-fA-F0-9]{40}$/', $value) === 1;
    }

    public static function isHex(mixed $value): bool
    {
        return is_string($value) && preg_match('/^0x[a-fA-F0-9]*$/', $value) === 1;
    }

    public static function isTxHash(mixed $value): bool
    {
        return is_string($value) && preg_match('/^0x[a-fA-F0-9]{64}$/', $value) === 1;
    }

    /**
     * Validate a JSON-RPC payload (single object or batch).
     *
     * @return array{0: array<int, array<string, mixed>>, 1: bool} calls and whether batched
     */
    public static function rpcPayload(mixed $body): array
    {
        if (!is_array($body) || $body === []) {
            throw new HttpException('JSON-RPC payload must be a non-empty object or array', 400, 'bad_request');
        }

        $batched = array_is_list($body);
        $calls = $batched ? $body : [$body];

        if (count($calls) > self::MAX_BATCH) {
            throw new HttpException('Too many batched calls (max ' . self::MAX_BATCH . ')', 400, 'bad_request');
        }

        foreach ($calls as $call) {
            if (!is_array($call)) {
                throw new HttpException('Each JSON-RPC call must be an object', 400, 'bad_request');
            }
            if (($call['jsonrpc'] ?? null) !== '2.0') {
                throw new HttpException('jsonrpc must be "2.0"', 400, 'bad_request');
            }
            if (!isset($call['method']) || !is_string($call['method'])) {
                throw new HttpException('method must be a string', 400, 'bad_request');
            }
            if (!in_array($call['method'], self::ALLOWED_RPC_METHODS, true)) {
                throw new HttpException('Method not allowed: ' . $call['method'], 400, 'bad_request');
            }
            if (isset($call['params']) && !is_array($call['params'])) {
                throw new HttpException('params must be an array', 400, 'bad_request');
            }
        }

        return [$calls, $batched];
    }

    /** @return array<string, mixed> */
    public static function contractRead(mixed $body): array
    {
        if (!is_array($body)) {
            throw new HttpException('Body must be a JSON object', 400, 'bad_request');
        }
        if (!self::isAddress($body['address'] ?? null)) {
            throw new HttpException('address must be a valid 0x-prefixed address', 400, 'bad_request');
        }
        if (isset($body['abi']) && !is_array($body['abi'])) {
            throw new HttpException('abi must be an array', 400, 'bad_request');
        }
        if (isset($body['data']) && !self::isHex($body['data'])) {
            throw new HttpException('data must be 0x-prefixed hex', 400, 'bad_request');
        }
        if (!isset($body['data'])) {
            if (!isset($body['method']) || !is_string($body['method']) || $body['method'] === '') {
                throw new HttpException('method is required when "data" is not supplied', 400, 'bad_request');
            }
            if (!isset($body['abi']) || !is_array($body['abi'])) {
                throw new HttpException('abi is required when "data" is not supplied', 400, 'bad_request');
            }
        }
        if (isset($body['params']) && !is_array($body['params'])) {
            throw new HttpException('params must be an array', 400, 'bad_request');
        }

        return [
            'address' => $body['address'],
            'abi' => $body['abi'] ?? [],
            'method' => $body['method'] ?? null,
            'params' => $body['params'] ?? [],
            'data' => $body['data'] ?? null,
        ];
    }

    /** @return array<string, mixed> */
    public static function estimate(mixed $body): array
    {
        if (!is_array($body)) {
            throw new HttpException('Body must be a JSON object', 400, 'bad_request');
        }
        foreach (['from', 'to'] as $field) {
            if (isset($body[$field]) && !self::isAddress($body[$field])) {
                throw new HttpException("{$field} must be a valid address", 400, 'bad_request');
            }
        }
        if (isset($body['value']) && !preg_match('/^\d+$/', (string) $body['value'])) {
            throw new HttpException('value must be a base-10 integer string', 400, 'bad_request');
        }
        if (isset($body['data']) && !self::isHex($body['data'])) {
            throw new HttpException('data must be 0x-prefixed hex', 400, 'bad_request');
        }
        return $body;
    }
}
