<?php

declare(strict_types=1);

/**
 * Front controller for the PHP gateway.
 *
 * Development:
 *   php -S 0.0.0.0:8080 index.php
 *
 * Production: point the web server document root at this directory and route
 * all requests to index.php. In both cases `secureproxy.php` may be used as
 * the entry point when the deployment must also serve static assets.
 */

require_once __DIR__ . '/bootstrap.php';

use Blower\Config\AppConfig;
use Blower\Middleware\Authentication;
use Blower\Middleware\RateLimit;
use Blower\Services\ContractService;
use Blower\Services\HttpService;
use Blower\Services\RpcService;
use Blower\Support\Request;
use Blower\Support\Router;

$GLOBALS['BLOWER_STARTED_AT'] = time();

/** @var AppConfig $config */
$config = $GLOBALS['BLOWER_CONFIG'];

$http = new HttpService((int) $config->get('rpc_timeout', 15));
$rpc = new RpcService($config, $http);
$contracts = new ContractService($rpc, $http, $config);

$router = new Router(
    $config,
    new Authentication($config),
    new RateLimit((int) $config->get('rate_limit_window', 60), (int) $config->get('rate_limit_max', 120)),
);

// Preflight requests are answered without touching upstream services.
if (Request::method() === 'OPTIONS') {
    header('Access-Control-Allow-Origin: ' . (Request::header('Origin') ?? '*'));
    header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-API-Key, X-Network, X-Chain-Id, Authorization');
    http_response_code(204);
    exit;
}

(require __DIR__ . '/routes/health.php')($router, $config, $rpc);
(require __DIR__ . '/routes/rpc.php')($router, $rpc);
(require __DIR__ . '/routes/contracts.php')($router, $contracts);
(require __DIR__ . '/routes/configuration.php')($router, $config, $rpc);

$router->dispatch(Request::method(), Request::path());
