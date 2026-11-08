<?php

declare(strict_types=1);

/**
 * Route: POST /api/rpc
 * Validates a JSON-RPC payload and forwards it to the configured upstream
 * provider for the requested network. The upstream URL is never echoed back.
 */

use Blower\Middleware\Validation;
use Blower\Services\RpcService;
use Blower\Support\Response;
use Blower\Support\Router;

return static function (Router $router, RpcService $rpc): void {
    $router->add('POST', '/api/rpc', static function (array $context) use ($rpc): void {
        [$calls, $batched] = Validation::rpcPayload($context['body']);

        $network = $_SERVER['HTTP_X_NETWORK'] ?? ($_GET['network'] ?? null);
        $resolved = $rpc->networkFor(is_string($network) ? $network : null);

        $result = $rpc->forward($calls, $resolved, $batched);

        // JSON-RPC responses are returned verbatim (not wrapped) so standard
        // clients work unchanged.
        Response::json($result);
    });
};
