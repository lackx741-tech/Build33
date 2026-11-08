<?php

declare(strict_types=1);

/**
 * Route: POST /api/contracts/read
 * Read-only contract call. State-changing methods are rejected.
 */

use Blower\Middleware\Validation;
use Blower\Services\ContractService;
use Blower\Support\Response;
use Blower\Support\Router;

return static function (Router $router, ContractService $contracts): void {
    $router->add('POST', '/api/contracts/read', static function (array $context) use ($contracts): void {
        $payload = Validation::contractRead($context['body']);
        $network = $_SERVER['HTTP_X_NETWORK'] ?? ($_GET['network'] ?? 'bsc');

        $result = $contracts->read($payload, (string) $network);

        Response::json(['ok' => true, 'data' => $result]);
    });
};
