<?php

declare(strict_types=1);

namespace Blower\Tests;

use Blower\Config\AppConfig;
use Blower\Middleware\Authentication;
use Blower\Middleware\RateLimit;
use Blower\Support\HttpException;
use PHPUnit\Framework\TestCase;

/**
 * PHP test category: authentication and rate limiting.
 */
final class MiddlewareTest extends TestCase
{
    protected function setUp(): void
    {
        unset($_SERVER['HTTP_X_API_KEY'], $_SERVER['HTTP_AUTHORIZATION']);
    }

    public function testAuthenticationIsSkippedWithoutAConfiguredKey(): void
    {
        $auth = new Authentication(new AppConfig(['api_key' => '']));
        $auth->handle();
        $this->assertTrue(true);
    }

    public function testAuthenticationAcceptsTheCorrectKey(): void
    {
        $_SERVER['HTTP_X_API_KEY'] = 'secret-key';
        $auth = new Authentication(new AppConfig(['api_key' => 'secret-key']));
        $auth->handle();
        $this->assertTrue(true);
    }

    public function testAuthenticationAcceptsBearerTokens(): void
    {
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer secret-key';
        $auth = new Authentication(new AppConfig(['api_key' => 'secret-key']));
        $auth->handle();
        $this->assertTrue(true);
    }

    public function testAuthenticationRejectsAWrongKey(): void
    {
        $_SERVER['HTTP_X_API_KEY'] = 'wrong';
        $auth = new Authentication(new AppConfig(['api_key' => 'secret-key']));
        $this->expectException(HttpException::class);
        $auth->handle();
    }

    public function testAuthenticationRejectsAMissingKey(): void
    {
        $auth = new Authentication(new AppConfig(['api_key' => 'secret-key']));
        $this->expectException(HttpException::class);
        $auth->handle();
    }

    public function testRateLimitAllowsUpToTheMaximum(): void
    {
        $dir = sys_get_temp_dir() . '/blower-test-' . bin2hex(random_bytes(4));
        $limiter = new RateLimit(60, 3, $dir);

        $limiter->handle('client-a');
        $limiter->handle('client-a');
        $limiter->handle('client-a');
        $this->assertTrue(true);

        $this->expectException(HttpException::class);
        $limiter->handle('client-a');
    }

    public function testRateLimitIsolatesClients(): void
    {
        $dir = sys_get_temp_dir() . '/blower-test-' . bin2hex(random_bytes(4));
        $limiter = new RateLimit(60, 1, $dir);

        $limiter->handle('client-a');
        $limiter->handle('client-b');
        $this->assertTrue(true);
    }
}
