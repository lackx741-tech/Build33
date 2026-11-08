<?php

declare(strict_types=1);

namespace Blower\Tests;

use Blower\Config\AppConfig;
use Blower\Config\Networks;
use PHPUnit\Framework\TestCase;

/**
 * PHP test category: API responses (configuration redaction) and network
 * metadata.
 */
final class ConfigurationTest extends TestCase
{
    private function config(): AppConfig
    {
        return new AppConfig([
            'env' => 'testing',
            'api_key' => 'super-secret',
            'node_api_url' => 'http://node:3000',
            'rpc' => [
                'bsc' => 'https://bsc.example/rpc?apikey=leak-me',
                'bscTestnet' => 'https://testnet.example/rpc',
            ],
            'chain_id' => 56,
            'allowed_origins' => ['http://localhost:5173'],
        ]);
    }

    public function testPublicViewRedactsSecrets(): void
    {
        $view = $this->config()->publicView();

        $this->assertArrayNotHasKey('api_key', $view);
        $this->assertSame('***', $view['rpc']['bsc']);
        $this->assertSame('***', $view['rpc']['bscTestnet']);
        $this->assertSame('***', $view['node_api_url']);
        $this->assertStringNotContainsString('leak-me', json_encode($view));
    }

    public function testPublicViewListsNetworks(): void
    {
        $view = $this->config()->publicView();
        $this->assertSame(['bsc', 'bscTestnet'], $view['networks']);
    }

    public function testAuthRequirementFollowsKeyPresence(): void
    {
        $this->assertTrue($this->config()->authRequired());
        $this->assertFalse((new AppConfig(['api_key' => '']))->authRequired());
    }

    public function testRpcUrlLookup(): void
    {
        $this->assertNotNull($this->config()->rpcUrl('bsc'));
        $this->assertNull($this->config()->rpcUrl('ethereum'));
    }

    public function testNetworkMetadataIsWellFormed(): void
    {
        $bsc = Networks::find('bsc');
        $this->assertSame(56, $bsc['chainId']);
        $this->assertSame('BNB', $bsc['nativeCurrency']['symbol']);
        $this->assertNull(Networks::find('polygon'));
    }
}
