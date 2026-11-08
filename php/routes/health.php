<?php

declare(strict_types=1);

/**
 * Route: GET /api/health
 * Public. Reports process health and upstream RPC reachability per network.
 */

use Blower\Config\AppConfig;
use Blower\Services\RpcService;
use Blower\Support\Response;
use Blower\Support\Router;

return static function (Router $router, AppConfig $config, RpcService $rpc): void {
    $router->add('GET', '/api/health', static function () use ($config, $rpc): void {
        $startedAt = (int) ($GLOBALS['BLOWER_STARTED_AT'] ?? time());

        $networks = [];
        foreach (array_keys((array) $config->get('rpc', [])) as $network) {
            $networks[$network] = ['chainId' => $rpc->chainId((string) $network)];
        }

        Response::json([
            'ok' => true,
            'data' => [
                'service' => 'blower-php-gateway',
                'env' => $config->get('env'),
                'uptimeSeconds' => max(0, time() - $startedAt),
                'pid' => getmypid(),
                'php' => PHP_VERSION,
                'networks' => $networks,
                'timestamp' => gmdate('c'),
            ],
        ]);
    });
};
