import { expect } from 'chai';
import hre from 'hardhat';

const { ethers } = hre;

describe('ConfigurationRegistry', () => {
  let registry;
  let admin;
  let other;
  const KEY = ethers.encodeBytes32String('fee.bps');

  beforeEach(async () => {
    [admin, other] = await ethers.getSigners();
    registry = await ethers.deployContract('ConfigurationRegistry');
    await registry.waitForDeployment();
  });

  it('grants DEFAULT_ADMIN_ROLE to the deployer', async () => {
    const role = await registry.DEFAULT_ADMIN_ROLE();
    expect(await registry.hasRole(role, admin.address)).to.equal(true);
  });

  it('stores and reads typed values', async () => {
    const CONFIG_ROLE = await registry.CONFIG_ROLE();
    await registry.grantRole(CONFIG_ROLE, admin.address);
    await registry.setUint(KEY, 250n);
    expect(await registry.getUint(KEY)).to.equal(250n);
    expect(await registry.exists(KEY)).to.equal(true);
  });

  it('rejects writes from unauthorized accounts', async () => {
    await expect(registry.connect(other).setUint(KEY, 1n))
      .to.be.revertedWith('AccessControl: unauthorized');
  });

  it('emits ConfigurationSet on write', async () => {
    const CONFIG_ROLE = await registry.CONFIG_ROLE();
    await registry.grantRole(CONFIG_ROLE, admin.address);
    await expect(registry.setString(KEY, 'hello'))
      .to.emit(registry, 'ConfigurationSet');
  });

  it('reverts on type mismatch reads', async () => {
    const CONFIG_ROLE = await registry.CONFIG_ROLE();
    await registry.grantRole(CONFIG_ROLE, admin.address);
    await registry.setBool(KEY, true);
    await expect(registry.getUint(KEY)).to.be.revertedWith('Config: not a uint');
  });
});
