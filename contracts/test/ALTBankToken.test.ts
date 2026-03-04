import { expect } from "chai";
import { ethers } from "hardhat";
import { ALTBankToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ALTBankToken", function () {
  // ─── Constants ──────────────────────────────────────────────────────────────
  const MAX_SUPPLY = ethers.parseEther("100000000"); // 100M ALT
  const GENESIS_MINT = ethers.parseEther("10000000"); // 10M ALT
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

  // ─── Fixtures ───────────────────────────────────────────────────────────────
  let token: ALTBankToken;
  let admin: SignerWithAddress;
  let minter: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let delegatee: SignerWithAddress;

  beforeEach(async () => {
    [admin, minter, alice, bob, delegatee] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ALTBankToken");
    token = (await Factory.deploy(admin.address)) as ALTBankToken;
  });

  // ─── Deployment ─────────────────────────────────────────────────────────────
  describe("Deployment", () => {
    it("should have correct name and symbol", async () => {
      expect(await token.name()).to.equal("ALT Bank Token");
      expect(await token.symbol()).to.equal("ALT");
    });

    it("should have 18 decimals", async () => {
      expect(await token.decimals()).to.equal(18);
    });

    it("should set MAX_SUPPLY to 100,000,000 ALT", async () => {
      expect(await token.MAX_SUPPLY()).to.equal(MAX_SUPPLY);
    });

    it("should mint GENESIS_MINT (10M ALT) to admin on deployment", async () => {
      expect(await token.balanceOf(admin.address)).to.equal(GENESIS_MINT);
    });

    it("should set totalSupply equal to GENESIS_MINT after deploy", async () => {
      expect(await token.totalSupply()).to.equal(GENESIS_MINT);
    });

    it("should grant DEFAULT_ADMIN_ROLE to admin", async () => {
      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("should grant MINTER_ROLE to admin initially", async () => {
      expect(await token.hasRole(MINTER_ROLE, admin.address)).to.be.true;
    });

    it("should revert construction with ZeroAddress", async () => {
      const Factory = await ethers.getContractFactory("ALTBankToken");
      await expect(Factory.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        token,
        "ZeroAddress"
      );
    });
  });

  // ─── ERC-20 Basics ──────────────────────────────────────────────────────────
  describe("ERC-20 Transfer", () => {
    it("should transfer tokens between accounts", async () => {
      await token.connect(admin).transfer(alice.address, ethers.parseEther("1000"));
      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("1000"));
    });

    it("should revert transfer when balance is insufficient", async () => {
      await expect(
        token.connect(alice).transfer(bob.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });

    it("should emit Transfer event on transfer", async () => {
      const amount = ethers.parseEther("500");
      await expect(token.connect(admin).transfer(alice.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(admin.address, alice.address, amount);
    });
  });

  // ─── Minting ────────────────────────────────────────────────────────────────
  describe("Minting", () => {
    beforeEach(async () => {
      // Grant MINTER_ROLE to dedicated minter account
      await token.connect(admin).grantRole(MINTER_ROLE, minter.address);
    });

    it("should allow MINTER_ROLE to mint tokens", async () => {
      const mintAmount = ethers.parseEther("500000");
      await token.connect(minter).mint(alice.address, mintAmount);
      expect(await token.balanceOf(alice.address)).to.equal(mintAmount);
    });

    it("should emit TokensMinted event on mint", async () => {
      const mintAmount = ethers.parseEther("1000");
      await expect(token.connect(minter).mint(alice.address, mintAmount))
        .to.emit(token, "TokensMinted")
        .withArgs(alice.address, mintAmount);
    });

    it("should correctly update totalSupply after minting", async () => {
      const mintAmount = ethers.parseEther("5000000");
      await token.connect(minter).mint(alice.address, mintAmount);
      expect(await token.totalSupply()).to.equal(GENESIS_MINT + mintAmount);
    });

    it("should revert minting if caller lacks MINTER_ROLE", async () => {
      await expect(
        token.connect(alice).mint(alice.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });

    it("should revert when minting would exceed MAX_SUPPLY", async () => {
      const remaining = MAX_SUPPLY - GENESIS_MINT;
      const overMint = remaining + 1n;
      await expect(
        token.connect(minter).mint(alice.address, overMint)
      ).to.be.revertedWithCustomError(token, "MaxSupplyExceeded");
    });

    it("should allow minting exactly up to MAX_SUPPLY", async () => {
      const remaining = MAX_SUPPLY - GENESIS_MINT;
      await token.connect(minter).mint(alice.address, remaining);
      expect(await token.totalSupply()).to.equal(MAX_SUPPLY);
    });

    it("should return correct remainingMintable", async () => {
      expect(await token.remainingMintable()).to.equal(MAX_SUPPLY - GENESIS_MINT);
    });
  });

  // ─── Burning ────────────────────────────────────────────────────────────────
  describe("Burning (ERC20Burnable)", () => {
    it("should allow token holder to burn their own tokens", async () => {
      const burnAmount = ethers.parseEther("1000000");
      await token.connect(admin).burn(burnAmount);
      expect(await token.balanceOf(admin.address)).to.equal(GENESIS_MINT - burnAmount);
    });

    it("should decrease totalSupply on burn", async () => {
      const burnAmount = ethers.parseEther("500000");
      await token.connect(admin).burn(burnAmount);
      expect(await token.totalSupply()).to.equal(GENESIS_MINT - burnAmount);
    });

    it("should allow burnFrom with approval", async () => {
      await token.connect(admin).transfer(alice.address, ethers.parseEther("1000"));
      await token.connect(alice).approve(bob.address, ethers.parseEther("500"));
      await token.connect(bob).burnFrom(alice.address, ethers.parseEther("500"));
      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("500"));
    });
  });

  // ─── Voting Delegation (ERC20Votes) ─────────────────────────────────────────
  describe("ERC20Votes — Delegation", () => {
    it("should have zero voting power until delegation", async () => {
      expect(await token.getVotes(admin.address)).to.equal(0n);
    });

    it("should assign voting power after self-delegation", async () => {
      await token.connect(admin).delegate(admin.address);
      expect(await token.getVotes(admin.address)).to.equal(GENESIS_MINT);
    });

    it("should transfer voting power on delegation change", async () => {
      await token.connect(admin).delegate(admin.address);
      await token.connect(admin).delegate(delegatee.address);
      expect(await token.getVotes(admin.address)).to.equal(0n);
      expect(await token.getVotes(delegatee.address)).to.equal(GENESIS_MINT);
    });

    it("should update voting checkpoints on token transfer after delegation", async () => {
      await token.connect(admin).delegate(admin.address);
      const transferAmount = ethers.parseEther("1000000");
      await token.connect(admin).transfer(alice.address, transferAmount);
      // Admin loses delegated votes, alice has no delegation yet
      expect(await token.getVotes(admin.address)).to.equal(GENESIS_MINT - transferAmount);
    });

    it("should return correct pastVotes for historical blocks", async () => {
      await token.connect(admin).delegate(admin.address);
      const blockBefore = await time.latestBlock();
      await time.advanceBlock();
      expect(await token.getPastVotes(admin.address, blockBefore)).to.equal(GENESIS_MINT);
    });

    it("should return correct pastTotalSupply", async () => {
      const blockBefore = await time.latestBlock();
      await time.advanceBlock();
      expect(await token.getPastTotalSupply(blockBefore)).to.equal(GENESIS_MINT);
    });
  });

  // ─── ERC20Permit (EIP-2612) ──────────────────────────────────────────────────
  describe("ERC20Permit — Gasless Approvals", () => {
    it("should have correct DOMAIN_SEPARATOR", async () => {
      const domain = await token.eip712Domain();
      expect(domain.name).to.equal("ALT Bank Token");
      expect(domain.version).to.equal("1");
    });

    it("should execute permit and update allowance without sender paying gas", async () => {
      const deadline = (await time.latest()) + 3600;
      const value = ethers.parseEther("500");
      const nonce = await token.nonces(admin.address);

      // EIP-712 signature
      const domain = {
        name: "ALT Bank Token",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await token.getAddress(),
      };
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };
      const permitData = {
        owner: admin.address,
        spender: alice.address,
        value,
        nonce,
        deadline,
      };

      const sig = await admin.signTypedData(domain, types, permitData);
      const { v, r, s } = ethers.Signature.from(sig);

      await token.permit(admin.address, alice.address, value, deadline, v, r, s);
      expect(await token.allowance(admin.address, alice.address)).to.equal(value);
    });

    it("should increment nonce after permit", async () => {
      const nonceBefore = await token.nonces(admin.address);
      const deadline = (await time.latest()) + 3600;
      const value = ethers.parseEther("1");

      const domain = {
        name: "ALT Bank Token",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await token.getAddress(),
      };
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };
      const sig = await admin.signTypedData(domain, types, {
        owner: admin.address,
        spender: alice.address,
        value,
        nonce: nonceBefore,
        deadline,
      });
      const { v, r, s } = ethers.Signature.from(sig);
      await token.permit(admin.address, alice.address, value, deadline, v, r, s);

      expect(await token.nonces(admin.address)).to.equal(nonceBefore + 1n);
    });

    it("should revert permit if deadline has passed", async () => {
      const expiredDeadline = (await time.latest()) - 1;
      await expect(
        token.permit(
          admin.address,
          alice.address,
          ethers.parseEther("1"),
          expiredDeadline,
          28,
          ethers.ZeroHash,
          ethers.ZeroHash
        )
      ).to.be.revertedWithCustomError(token, "ERC2612ExpiredSignature");
    });
  });

  // ─── AccessControl ───────────────────────────────────────────────────────────
  describe("AccessControl", () => {
    it("should allow admin to grant MINTER_ROLE", async () => {
      await token.connect(admin).grantRole(MINTER_ROLE, minter.address);
      expect(await token.hasRole(MINTER_ROLE, minter.address)).to.be.true;
    });

    it("should allow admin to revoke MINTER_ROLE", async () => {
      await token.connect(admin).grantRole(MINTER_ROLE, minter.address);
      await token.connect(admin).revokeRole(MINTER_ROLE, minter.address);
      expect(await token.hasRole(MINTER_ROLE, minter.address)).to.be.false;
    });

    it("should revert if non-admin tries to grant roles", async () => {
      await expect(
        token.connect(alice).grantRole(MINTER_ROLE, alice.address)
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });
  });
});
