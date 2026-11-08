import hre from 'hardhat';

/**
 * Deploys the full contract suite and prints the addresses in the
 * `CONTRACT_<NAME>_ADDRESS` form the backend expects.
 *
 *   npx hardhat run script/deploy.js --network bscTestnet
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with ${deployer.address}`);

  const registry = await hre.ethers.deployContract('ConfigurationRegistry');
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();

  const permissions = await hre.ethers.deployContract('PermissionRegistry');
  await permissions.waitForDeployment();
  const permissionsAddress = await permissions.getAddress();

  const authorization = await hre.ethers.deployContract('UserAuthorization');
  await authorization.waitForDeployment();
  const authorizationAddress = await authorization.getAddress();

  const transactions = await hre.ethers.deployContract('TransactionRegistry', [authorizationAddress]);
  await transactions.waitForDeployment();
  const transactionsAddress = await transactions.getAddress();

  const summary = {
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    contracts: {
      ConfigurationRegistry: registryAddress,
      PermissionRegistry: permissionsAddress,
      UserAuthorization: authorizationAddress,
      TransactionRegistry: transactionsAddress,
    },
  };

  console.log(JSON.stringify(summary, null, 2));
  console.log('\nAdd to your .env:');
  for (const [name, address] of Object.entries(summary.contracts)) {
    console.log(`CONTRACT_${name.toUpperCase()}_ADDRESS_${summary.chainId}=${address}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
