<?php

declare(strict_types=1);

namespace Blower\Config;

/**
 * Network metadata served to clients. Kept in sync with the frontend
 * network.config.js and the Node service networks.js.
 */
final class Networks
{
    /** @return array<string, array<string, mixed>> */
    public static function all(): array
    {
        return [
            'bsc' => [
                'key' => 'bsc',
                'chainId' => 56,
                'name' => 'BNB Smart Chain',
                'nativeCurrency' => ['name' => 'BNB', 'symbol' => 'BNB', 'decimals' => 18],
                'explorer' => 'https://bscscan.com',
                'rpcEnv' => 'BSC_RPC_URL',
            ],
            'bscTestnet' => [
                'key' => 'bscTestnet',
                'chainId' => 97,
                'name' => 'BNB Smart Chain Testnet',
                'nativeCurrency' => ['name' => 'tBNB', 'symbol' => 'tBNB', 'decimals' => 18],
                'explorer' => 'https://testnet.bscscan.com',
                'rpcEnv' => 'BSC_TESTNET_RPC_URL',
            ],
        ];
    }

    public static function find(string $key): ?array
    {
        return self::all()[$key] ?? null;
    }
}
