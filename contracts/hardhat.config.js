import 'dotenv/config';
import '@nomicfoundation/hardhat-toolbox';

const accounts = process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [];

/** @type {import('hardhat/config').HardhatUserConfig} */
export default {
  solidity: {
    version: '0.8.24',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  paths: {
    sources: './src',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  networks: {
    hardhat: { chainId: 31337 },
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
      chainId: 97,
      accounts,
    },
    bsc: {
      url: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
      chainId: 56,
      accounts,
    },
  },
  etherscan: {
    apiKey: { bsc: process.env.BSCSCAN_API_KEY || '', bscTestnet: process.env.BSCSCAN_API_KEY || '' },
  },
};
