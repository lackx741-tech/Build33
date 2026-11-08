<?php

declare(strict_types=1);

/**
 * Routes:
 *   GET  /api/configuration
 *   GET  /api/networks
 *   POST /api/transactions/estimate
 */

use Blower\Config\AppConfig;
use Blower\Config\Networks;
use Blower\Middleware\Validation;
use Blower\Services\RpcService;
use Blower\Support\Response;
use Blower\Support\Router;

return static function (Router $router, AppConfig $config, RpcService $rpc): void {
    $router->add('GET', '/api/configuration', static function () use ($config): void {
        Response::json(['ok' => true, 'data' => $config->publicView()]);
    });

    $router->add('GET', '/api/networks', static function () use ($config): void {
        $available = [];
        foreach (Networks::all() as $key => $network) {
            if ($config->rpcUrl($key) === null) {
                continue;
            }
            unset($network['rpcEnv']);
            $available[] = $network;
        }

        Response::json([
            'ok' => true,
            'data' => [
                'default' => $config->get('chain_id'),
                'networks' => $available,
            ],
        ]);
    });

    $router->add('POST', '/api/transactions/estimate', static function (array $context) use ($rpc): void {
        $tx = Validation::estimate($context['body']);
        $network = $_SERVER['HTTP_X_NETWORK'] ?? ($_GET['network'] ?? null);
        $resolved = $rpc->networkFor(is_string($network) ? $network : null);

        $gas = $rpc->estimateGas($tx, $resolved);

        Response::json(['ok' => true, 'data' => ['network' => $resolved, 'gas' => $gas]]);
    });
};
