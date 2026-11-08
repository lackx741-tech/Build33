import { expect } from 'chai';
import hre from 'hardhat';

const { ethers } = hre;

describe('UserAuthorization', () => {
  let auth;
  let operator;
  let user;
  let stranger;

  beforeEach(async () => {
    [operator, user, stranger] = await ethers.getSigners();
    auth = await ethers.deployContract('UserAuthorization');
    await auth.waitForDeployment();
  });

  it('allows self authorization', async () => {
    await auth.connect(user).authorizeSelf(0);
    expect(await auth.isAuthorized(user.address)).to.equal(true);
    expect(await auth.isAuthorized(stranger.address)).to.equal(false);
  });

  it('respects expiry', async () => {
    const now = (await ethers.provider.getBlock('latest')).timestamp;
    await auth.connect(user).authorizeSelf(now + 60);
    expect(await auth.isAuthorized(user.address)).to.equal(true);

    await ethers.provider.send('evm_increaseTime', [120]);
    await ethers.provider.send('evm_mine', []);
    expect(await auth.isAuthorized(user.address)).to.equal(false);
  });

  it('rejects expiry in the past', async () => {
    await expect(auth.connect(user).authorizeSelf(1)).to.be.revertedWith('UserAuth: expiry in past');
  });

  it('lets the operator deauthorize', async () => {
    await auth.connect(user).authorizeSelf(0);
    await expect(auth.deauthorize(user.address)).to.emit(auth, 'Deauthorized');
    expect(await auth.isAuthorized(user.address)).to.equal(false);
  });

  it('blocks non-operators from deauthorizing', async () => {
    await auth.connect(user).authorizeSelf(0);
    await expect(auth.connect(stranger).deauthorize(user.address)).to.be.revertedWith('UserAuth: not operator');
  });
});

describe('TransactionRegistry', () => {
  let auth;
  let registry;
  let admin;
  let user;
  const REF = ethers.encodeBytes32String('ref-1');
  const OP = ethers.encodeBytes32String('transfer');

  beforeEach(async () => {
    [admin, user] = await ethers.getSigners();
    auth = await ethers.deployContract('UserAuthorization');
    await auth.waitForDeployment();
    registry = await ethers.deployContract('TransactionRegistry', [await auth.getAddress()]);
    await registry.waitForDeployment();
    const RECORDER_ROLE = await registry.RECORDER_ROLE();
    await registry.grantRole(RECORDER_ROLE, admin.address);
    await auth.connect(user).authorizeSelf(0);
  });

  it('records a transaction and emits an event', async () => {
    await expect(registry.record(REF, user.address, OP, 100n))
      .to.emit(registry, 'TransactionRecorded');
    expect(await registry.count()).to.equal(1n);
    const [account, operation, value, status] = await registry.get(REF);
    expect(account).to.equal(user.address);
    expect(operation).to.equal(OP);
    expect(value).to.equal(100n);
    expect(status).to.equal(0n);
  });

  it('rejects recording for an unauthorized account', async () => {
    const [, , stranger] = await ethers.getSigners();
    await expect(registry.record(REF, stranger.address, OP, 1n))
      .to.be.revertedWith('TxRegistry: account not authorized');
  });

  it('rejects duplicate references', async () => {
    await registry.record(REF, user.address, OP, 1n);
    await expect(registry.record(REF, user.address, OP, 1n))
      .to.be.revertedWith('TxRegistry: reference exists');
  });

  it('finalizes status once', async () => {
    await registry.record(REF, user.address, OP, 1n);
    await registry.setStatus(REF, 1);
    await expect(registry.setStatus(REF, 2)).to.be.revertedWith('TxRegistry: already finalized');
  });
});
