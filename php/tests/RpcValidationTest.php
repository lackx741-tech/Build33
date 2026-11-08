<?php

declare(strict_types=1);

namespace Blower\Tests;

use Blower\Middleware\Validation;
use Blower\Support\HttpException;
use PHPUnit\Framework\TestCase;

/**
 * PHP test category: RPC validation.
 */
final class RpcValidationTest extends TestCase
{
    public function testAcceptsAValidSingleCall(): void
    {
        [$calls, $batched] = Validation::rpcPayload([
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => 'eth_blockNumber',
            'params' => [],
        ]);

        $this->assertCount(1, $calls);
        $this->assertFalse($batched);
        $this->assertSame('eth_blockNumber', $calls[0]['method']);
    }

    public function testAcceptsABatch(): void
    {
        [$calls, $batched] = Validation::rpcPayload([
            ['jsonrpc' => '2.0', 'id' => 1, 'method' => 'eth_chainId', 'params' => []],
            ['jsonrpc' => '2.0', 'id' => 2, 'method' => 'eth_gasPrice', 'params' => []],
        ]);

        $this->assertCount(2, $calls);
        $this->assertTrue($batched);
    }

    public function testRejectsUnknownMethods(): void
    {
        $this->expectException(HttpException::class);
        Validation::rpcPayload(['jsonrpc' => '2.0', 'id' => 1, 'method' => 'debug_traceTransaction']);
    }

    public function testRejectsBadProtocolVersion(): void
    {
        $this->expectException(HttpException::class);
        Validation::rpcPayload(['jsonrpc' => '1.0', 'id' => 1, 'method' => 'eth_chainId']);
    }

    public function testRejectsOversizedBatches(): void
    {
        $call = ['jsonrpc' => '2.0', 'id' => 1, 'method' => 'eth_chainId'];
        $this->expectException(HttpException::class);
        Validation::rpcPayload(array_fill(0, Validation::MAX_BATCH + 1, $call));
    }

    public function testRejectsEmptyPayload(): void
    {
        $this->expectException(HttpException::class);
        Validation::rpcPayload([]);
    }

    public function testRejectsNonArrayParams(): void
    {
        $this->expectException(HttpException::class);
        Validation::rpcPayload(['jsonrpc' => '2.0', 'id' => 1, 'method' => 'eth_chainId', 'params' => 'nope']);
    }

    public function testValidatesAddressesAndHashes(): void
    {
        $this->assertTrue(Validation::isAddress('0x1234567890abcdef1234567890abcdef12345678'));
        $this->assertFalse(Validation::isAddress('0x123'));
        $this->assertTrue(Validation::isTxHash('0x' . str_repeat('a', 64)));
        $this->assertFalse(Validation::isTxHash('0xabc'));
    }

    public function testContractReadRequiresMethodOrData(): void
    {
        $this->expectException(HttpException::class);
        Validation::contractRead(['address' => '0x1234567890abcdef1234567890abcdef12345678']);
    }

    public function testContractReadAcceptsEncodedData(): void
    {
        $payload = Validation::contractRead([
            'address' => '0x1234567890abcdef1234567890abcdef12345678',
            'data' => '0x18160ddd',
        ]);
        $this->assertSame('0x18160ddd', $payload['data']);
    }

    public function testEstimateRejectsBadValue(): void
    {
        $this->expectException(HttpException::class);
        Validation::estimate(['to' => '0x1234567890abcdef1234567890abcdef12345678', 'value' => '1.5']);
    }
}
