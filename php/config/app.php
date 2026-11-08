<?php

declare(strict_types=1);

namespace Blower\Config;

use Blower\Support\Env;

/**
 * Immutable application configuration built from the environment at startup.
 * Secrets are redacted by publicView() before ever reaching a response.
 */
final class AppConfig
{
    public function __construct(private readonly array $values)
    {
    }

    public static function fromEnvironment(): self
    {
        return new self([
            'env' => Env::get('PHP_ENV', 'development'),
            'api_key' => Env::get('PHP_API_KEY', ''),
            'node_api_url' => Env::get('NODE_API_URL'),
            'rpc' => [
                'bsc' => Env::get('BSC_RPC_URL', 'https://bsc-dataseed.binance.org'),
                'bscTestnet' => Env::get('BSC_TESTNET_RPC_URL', 'https://data-seed-prebsc-1-s1.binance.org:8545'),
            ],
            'chain_id' => Env::int('BSC_CHAIN_ID', 56),
            'rpc_timeout' => Env::int('RPC_TIMEOUT', 15),
            'rate_limit_window' => Env::int('RATE_LIMIT_WINDOW', 60),
            'rate_limit_max' => Env::int('RATE_LIMIT_MAX', 120),
            'allowed_origins' => array_values(array_filter(array_map(
                'trim',
                explode(',', (string) Env::get('ALLOWED_ORIGINS', '')),
            ))),
            'log_level' => Env::get('LOG_LEVEL', 'info'),
        ]);
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return $this->values[$key] ?? $default;
    }

    public function rpcUrl(string $network): ?string
    {
        $url = $this->values['rpc'][$network] ?? null;
        return is_string($url) && $url !== '' ? $url : null;
    }

    public function apiKey(): string
    {
        return (string) ($this->values['api_key'] ?? '');
    }

    public function authRequired(): bool
    {
        return $this->apiKey() !== '';
    }

    /** Configuration view safe to return over HTTP, with secrets redacted. */
    public function publicView(): array
    {
        $out = $this->values;

        unset($out['api_key']);
        if (array_key_exists('node_api_url', $out)) {
            $out['node_api_url'] = $out['node_api_url'] === null ? null : '***';
        }
        if (isset($out['rpc']) && is_array($out['rpc'])) {
            $out['networks'] = array_keys($out['rpc']);
            $out['rpc'] = array_map(static fn () => '***', $out['rpc']);
        }

        return $out;
    }
}
