import { expect } from "chai";
import { ethers } from "hardhat";
import { ALTBankVault, ALTBankToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ALTBankVault", function () {
  // ─── Constants ──────────────────────────────────────────────────────────────
  const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  const DEAD_SHARES = 1000n;
  const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
  const EMERGENCY_PENALTY_BPS = 100n;
  const BPS_DENOMINATOR = 10_000n;

  // ─── Fixtures ───────────────────────────────────────────────────────────────
  let vault: ALTBankVault;
  let token: ALTBankToken;
  let admin: SignerWithAddress;
  let operator: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let treasury: SignerWithAddress;
  let newTreasury: SignerWithAddress;

  const DEPOSIT_AMOUNT = ethers.parseEther("10000");
  const GENESIS_MINT = ethers.parseEther("10000000"); // 10M ALT

  beforeEach(async () => {
    [admin, operator, alice, bob, treasury, newTreasury] = await ethers.getSigners();

    // Deploy token
    const TokenFactory = await ethers.getContractFactory("ALTBankToken");
    token = (await TokenFactory.deploy(admin.address)) as ALTBankToken;

    // Deploy vault with token as underlying asset
    const VaultFactory = await ethers.getContractFactory("ALTBankVault");
    vault = (await VaultFactory.deploy(
      await token.getAddress(),
      admin.address,
      treasury.address
    )) as ALTBankVault;

    // Grant OPERATOR_ROLE to operator
    await vault.connect(admin).grantRole(OPERATOR_ROLE, operator.address);

    // Distribute tokens to test accounts
    await token.connect(admin).transfer(alice.address, ethers.parseEther("500000"));
    await token.connect(admin).transfer(bob.address, ethers.parseEther("500000"));
    await token.connect(admin).transfer(operator.address, ethers.parseEther("100000"));
  });

  // ─── Deployment ─────────────────────────────────────────────────────────────
  describe("Deployment", () => {
    it("should have correct name and symbol", async () => {
      expect(await vault.name()).to.equal("ALT Vault Share");
      expect(await vault.symbol()).to.equal("vALT");
    });

    it("should reference the correct underlying asset", async () => {
      expect(await vault.asset()).to.equal(await token.getAddress());
    });

    it("should mint dead shares to DEAD_ADDRESS", async () => {
      expect(await vault.balanceOf(DEAD_ADDRESS)).to.equal(DEAD_SHARES);
    });

    it("should set the correct treasury address", async () => {
      expect(await vault.treasury()).to.equal(treasury.address);
    });

    it("should grant DEFAULT_ADMIN_ROLE to admin", async () => {
      expect(await vault.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("should grant OPERATOR_ROLE to admin initially", async () => {
      expect(await vault.hasRole(OPERATOR_ROLE, admin.address)).to.be.true;
    });

    it("should revert if admin is zero address", async () => {
      const VaultFactory = await ethers.getContractFactory("ALTBankVault");
      await expect(
        VaultFactory.deploy(await token.getAddress(), ethers.ZeroAddress, treasury.address)
      ).to.be.revertedWithCustomError(vault, "ZeroAddress");
    });

    it("should revert if treasury is zero address", async () => {
      const VaultFactory = await ethers.getContractFactory("ALTBankVault");
      await expect(
        VaultFactory.deploy(await token.getAddress(), admin.address, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(vault, "ZeroAddress");
    });
  });

  // ─── ERC-4626: Deposit & Withdraw ──────────────────────────────────────────
  describe("ERC-4626: Deposit & Withdraw", () => {
    beforeEach(async () => {
      // Alice approves vault to spend her tokens
      await token.connect(alice).approve(await vault.getAddress(), ethers.MaxUint256);
    });

    it("should deposit assets and mint shares", async () => {
      const tx = await vault.connect(alice).deposit(DEPOSIT_AMOUNT, alice.address);
      await tx.wait();

      const shares = await vault.balanceOf(alice.address);
      expect(shares).to.be.gt(0n);
      expect(await token.balanceOf(await vault.getAddress())).to.equal(DEPOSIT_AMOUNT);
    });

    it("should emit Deposit event on deposit", async () => {
      await expect(vault.connect(alice).deposit(DEPOSIT_AMOUNT, alice.address)).to.emit(
        vault,
        "Deposit"
      );
    });

    it("should withdraw assets by burning shares", async () => {
      await vault.connect(alice).deposit(DEPOSIT_AMOUNT, alice.address);
      const shares = await vault.balanceOf(alice.address);

      const balanceBefore = await token.balanceOf(alice.address);
      await vault.connect(alice).redeem(shares, alice.address, alice.address);
      const balanceAfter = await token.balanceOf(alice.address);

      // Should get back approximately the deposited amount (minus rounding)
      expect(balanceAfter - balanceBefore).to.be.closeTo(DEPOSIT_AMOUNT, ethers.parseEther("1"));
    });

    it("should revert deposit with zero amount", async () => {
      await expect(vault.connect(alice).deposit(0n, alice.address)).to.be.revertedWithCustomError(
        vault,
        "ZeroAmount"
      );
    });

    it("should revert mint with zero shares", async () => {
      await expect(vault.connect(alice).mint(0n, alice.address)).to.be.revertedWithCustomError(
        vault,
        "ZeroAmount"
      );
    });

    it("should report correct totalAssets after deposit", async () => {
      await vault.connect(alice).deposit(DEPOSIT_AMOUNT, alice.address);
      expect(await vault.totalAssets()).to.equal(DEPOSIT_AMOUNT);
    });

    it("should allow convertToAssets and convertToShares", async () => {
      await vault.connect(alice).deposit(DEPOSIT_AMOUNT, alice.address);
      const shares = await vault.balanceOf(alice.address);
      const assets = await vault.convertToAssets(shares);
      // Assets should be close to deposited amount (accounting for dead shares rounding)
      expect(assets).to.be.closeTo(DEPOSIT_AMOUNT, ethers.parseEther("1"));
    });
  });

  // ─── Share Price Appreciation via Yield ────────────────────────────────────
  describe("Yield Deposit (Share Price Appreciation)", () => {
    const yieldAmount = ethers.parseEther("5000");

    beforeEach(async () => {
      // Alice deposits
      await token.connect(alice).approve(await vault.getAddress(), ethers.MaxUint256);
      await vault.connect(alice).deposit(DEPOSIT_AMOUNT, alice.address);

      // Operator approves vault to spend tokens for yield deposit
      await token.connect(operator).approve(await vault.getAddress(), ethers.MaxUint256);
    });

    it("should increase totalAssets after depositYield", async () => {
      const totalBefore = await vault.totalAssets();
      await vault.connect(operator).depositYield(yieldAmount);
      expect(await vault.totalAssets()).to.equal(totalBefore + yieldAmount);
    });

    it("should increase share price (convertToAssets) after yield", async () => {
      const aliceShares = await vault.balanceOf(alice.address);
      const valueBefore = await vault.convertToAssets(aliceShares);

      await vault.connect(operator).depositYield(yieldAmount);

      const valueAfter = await vault.convertToAssets(aliceShares);
      // Alice's shares should now be worth more
      expect(valueAfter).to.be.gt(valueBefore);
    });

    it("should emit YieldDeposited event", async () => {
      await expect(vault.connect(operator).depositYield(yieldAmount)).to.emit(
        vault,
        "YieldDeposited"
      );
    });

    it("should track totalYieldDeposited", async () => {
      await vault.connect(operator).depositYield(yieldAmount);
      await vault.connect(operator).depositYield(yieldAmount);
      expect(await vault.totalYieldDeposited()).to.equal(yieldAmount * 2n);
    });

    it("should revert depositYield with zero amount", async () => {
      await expect(vault.connect(operator).depositYield(0n)).to.be.revertedWithCustomError(
        vault,
        "ZeroAmount"
      );
    });

    it("should revert depositYield if caller lacks OPERATOR_ROLE", async () => {
      await token.connect(alice).approve(await vault.getAddress(), ethers.MaxUint256);
      await expect(vault.connect(alice).depositYield(yieldAmount)).to.be.revertedWithCustomError(
        vault,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  // ─── First-Depositor Inflation Attack ──────────────────────────────────────
  describe("First-Depositor Inflation Attack Prevention", () => {
    it("should have dead shares preventing zero-share-deposit exploit", async () => {
      // Pre-condition: dead shares exist
      expect(await vault.totalSupply()).to.equal(DEAD_SHARES);

      // An attacker trying to front-run by sending tokens directly to the vault
      // gets diluted by dead shares — they cannot manipulate the ratio
      const attackAmount = ethers.parseEther("1000000"); // 1M tokens direct transfer
      await token.connect(admin).transfer(await vault.getAddress(), attackAmount);

      // Now alice deposits — she should still get reasonable shares
      await token.connect(alice).approve(await vault.getAddress(), ethers.MaxUint256);
      await vault.connect(alice).deposit(ethers.parseEther("1000"), alice.address);
      const aliceShares = await vault.balanceOf(alice.address);

      // Alice must get shares > 0 (attack would make this zero without dead shares)
      expect(aliceShares).to.be.gt(0n);
    });
  });

  // ─── Emergency Withdrawal ──────────────────────────────────────────────────
  describe("Emergency Withdrawal", () => {
    beforeEach(async () => {
      await token.connect(alice).approve(await vault.getAddress(), ethers.MaxUint256);
      await vault.connect(alice).deposit(DEPOSIT_AMOUNT, alice.address);
    });

    it("should allow emergency withdraw with 1% penalty", async () => {
      const shares = await vault.balanceOf(alice.address);
      const grossAssets = await vault.convertToAssets(shares);
      const expectedPenalty = (grossAssets * EMERGENCY_PENALTY_BPS) / BPS_DENOMINATOR;

      const aliceBalanceBefore = await token.balanceOf(alice.address);
      const treasuryBalanceBefore = await token.balanceOf(treasury.address);

      await vault.connect(alice).emergencyWithdraw(shares);

      const aliceBalanceAfter = await token.balanceOf(alice.address);
      const treasuryBalanceAfter = await token.balanceOf(treasury.address);

      // Alice receives gross - penalty
      const aliceReceived = aliceBalanceAfter - aliceBalanceBefore;
      expect(aliceReceived).to.be.closeTo(grossAssets - expectedPenalty, ethers.parseEther("1"));

      // Treasury receives penalty
      const treasuryReceived = treasuryBalanceAfter - treasuryBalanceBefore;
      expect(treasuryReceived).to.be.closeTo(expectedPenalty, ethers.parseEther("1"));
    });

    it("should emit EmergencyWithdrawal event", async () => {
      const shares = await vault.balanceOf(alice.address);
      await expect(vault.connect(alice).emergencyWithdraw(shares)).to.emit(
        vault,
        "EmergencyWithdrawal"
      );
    });

    it("should burn all shares after emergency withdraw", async () => {
      const shares = await vault.balanceOf(alice.address);
      await vault.connect(alice).emergencyWithdraw(shares);
      expect(await vault.balanceOf(alice.address)).to.equal(0n);
    });

    it("should revert emergency withdraw with zero shares", async () => {
      await expect(vault.connect(alice).emergencyWithdraw(0n)).to.be.revertedWithCustomError(
        vault,
        "ZeroAmount"
      );
    });

    it("should revert emergency withdraw with insufficient shares", async () => {
      const balance = await vault.balanceOf(alice.address);
      await expect(
        vault.connect(alice).emergencyWithdraw(balance + 1n)
      ).to.be.revertedWithCustomError(vault, "InsufficientShares");
    });

    it("should work even when the vault is paused", async () => {
      await vault.connect(operator).pause();

      const shares = await vault.balanceOf(alice.address);
      // This must NOT revert — emergency withdraw works during pause
      await expect(vault.connect(alice).emergencyWithdraw(shares)).to.not.be.reverted;
    });
  });

  // ─── Pause Semantics ───────────────────────────────────────────────────────
  describe("Pause Semantics", () => {
    beforeEach(async () => {
      await token.connect(alice).approve(await vault.getAddress(), ethers.MaxUint256);
      await vault.connect(alice).deposit(DEPOSIT_AMOUNT, alice.address);
    });

    it("should block deposit when paused", async () => {
      await vault.connect(operator).pause();
      await expect(
        vault.connect(alice).deposit(ethers.parseEther("100"), alice.address)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");
    });

    it("should block mint when paused", async () => {
      await vault.connect(operator).pause();
      await expect(
        vault.connect(alice).mint(ethers.parseEther("100"), alice.address)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");
    });

    it("should ALLOW withdraw when paused", async () => {
      await vault.connect(operator).pause();
      const shares = await vault.balanceOf(alice.address);
      const assets = await vault.convertToAssets(shares);
      // Withdraw must succeed even when paused
      await expect(vault.connect(alice).withdraw(assets / 2n, alice.address, alice.address)).to.not
        .be.reverted;
    });

    it("should ALLOW redeem when paused", async () => {
      await vault.connect(operator).pause();
      const shares = await vault.balanceOf(alice.address);
      // Redeem must succeed even when paused
      await expect(vault.connect(alice).redeem(shares / 2n, alice.address, alice.address)).to.not.be
        .reverted;
    });

    it("should resume deposit after unpause", async () => {
      await vault.connect(operator).pause();
      await vault.connect(operator).unpause();
      await expect(vault.connect(alice).deposit(ethers.parseEther("100"), alice.address)).to.not.be
        .reverted;
    });

    it("should revert pause if caller lacks OPERATOR_ROLE", async () => {
      await expect(vault.connect(alice).pause()).to.be.revertedWithCustomError(
        vault,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("should revert unpause if caller lacks OPERATOR_ROLE", async () => {
      await vault.connect(operator).pause();
      await expect(vault.connect(alice).unpause()).to.be.revertedWithCustomError(
        vault,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  // ─── Treasury Management ───────────────────────────────────────────────────
  describe("Treasury Management", () => {
    it("should allow admin to update treasury", async () => {
      await vault.connect(admin).setTreasury(newTreasury.address);
      expect(await vault.treasury()).to.equal(newTreasury.address);
    });

    it("should emit TreasuryUpdated event", async () => {
      await expect(vault.connect(admin).setTreasury(newTreasury.address))
        .to.emit(vault, "TreasuryUpdated")
        .withArgs(treasury.address, newTreasury.address);
    });

    it("should revert setTreasury to zero address", async () => {
      await expect(
        vault.connect(admin).setTreasury(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(vault, "ZeroAddress");
    });

    it("should revert setTreasury if caller is not admin", async () => {
      await expect(
        vault.connect(alice).setTreasury(newTreasury.address)
      ).to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });
  });

  // ─── Multi-User Scenarios ──────────────────────────────────────────────────
  describe("Multi-User Deposit & Withdraw", () => {
    it("should give proportional shares to multiple depositors", async () => {
      await token.connect(alice).approve(await vault.getAddress(), ethers.MaxUint256);
      await token.connect(bob).approve(await vault.getAddress(), ethers.MaxUint256);

      // Alice deposits 10,000
      await vault.connect(alice).deposit(DEPOSIT_AMOUNT, alice.address);
      // Bob deposits 10,000
      await vault.connect(bob).deposit(DEPOSIT_AMOUNT, bob.address);

      const aliceShares = await vault.balanceOf(alice.address);
      const bobShares = await vault.balanceOf(bob.address);

      // Both deposited the same amount — shares should be equal
      expect(aliceShares).to.equal(bobShares);
    });

    it("should distribute yield proportionally to all holders", async () => {
      await token.connect(alice).approve(await vault.getAddress(), ethers.MaxUint256);
      await token.connect(bob).approve(await vault.getAddress(), ethers.MaxUint256);
      await token.connect(operator).approve(await vault.getAddress(), ethers.MaxUint256);

      // Both deposit equal amounts
      await vault.connect(alice).deposit(DEPOSIT_AMOUNT, alice.address);
      await vault.connect(bob).deposit(DEPOSIT_AMOUNT, bob.address);

      // Operator injects yield
      const yieldAmount = ethers.parseEther("2000");
      await vault.connect(operator).depositYield(yieldAmount);

      // Both should see equal share value increase
      const aliceValue = await vault.convertToAssets(await vault.balanceOf(alice.address));
      const bobValue = await vault.convertToAssets(await vault.balanceOf(bob.address));

      // Values should be close (equal deposit + equal yield share)
      expect(aliceValue).to.be.closeTo(bobValue, ethers.parseEther("1"));
      // Each should be worth more than their initial deposit
      expect(aliceValue).to.be.gt(DEPOSIT_AMOUNT);
    });
  });
});
