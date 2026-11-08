<?php

declare(strict_types=1);

/**
 * Shared helpers and class loading.
 *
 * The spec fixes a flat, explicit file layout (config/, middleware/,
 * services/, routes/). Rather than depend on Composer's autoloader being
 * installed, every class file is required here so the service runs from a
 * plain checkout.
 */

require_once __DIR__ . '/lib/env.php';
require_once __DIR__ . '/lib/logger.php';
require_once __DIR__ . '/lib/http-exception.php';
require_once __DIR__ . '/lib/response.php';
require_once __DIR__ . '/lib/request.php';
require_once __DIR__ . '/lib/router.php';
require_once __DIR__ . '/config/app.php';
require_once __DIR__ . '/config/networks.php';
require_once __DIR__ . '/middleware/authentication.php';
require_once __DIR__ . '/middleware/rate-limit.php';
require_once __DIR__ . '/middleware/validation.php';
require_once __DIR__ . '/services/HttpService.php';
require_once __DIR__ . '/services/RpcService.php';
require_once __DIR__ . '/services/ContractService.php';

use Blower\Config\AppConfig;
use Blower\Support\Env;
use Blower\Support\Logger;

Env::load(__DIR__ . '/.env');
Logger::configure((string) Env::get('LOG_LEVEL', 'info'));

$GLOBALS['BLOWER_CONFIG'] = AppConfig::fromEnvironment();
