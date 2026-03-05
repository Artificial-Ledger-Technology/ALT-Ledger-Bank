import { expect } from "chai";
import { ethers } from "hardhat";
import { PriceOracle, MockV3Aggregator } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("PriceOracle", function () {
    // ─── Constants ──────────────────────────────────────────────────────────────
    const ORACLE_ADMIN = ethers.keccak256(ethers.toUtf8Bytes("ORACLE_ADMIN"));
    const STALENESS_THRESHOLD = 3600; // 1 hour
    const ETH_PRICE = 2000_00000000n; // $2,000.00 with 8 decimals
    const BTC_PRICE = 60000_00000000n; // $60,000.00 with 8 decimals
    const WAD_PRECISION = 10n ** 10n; // 1e10 multiplier for 8→18 dec

    // ─── Fixtures ───────────────────────────────────────────────────────────────
    let oracle: PriceOracle;
    let mockETHFeed: MockV3Aggregator;
    let mockBTCFeed: MockV3Aggregator;
    let admin: SignerWithAddress;
    let alice: SignerWithAddress;
    let fakeToken1: SignerWithAddress; // Used as a "token address"
    let fakeToken2: SignerWithAddress;

    beforeEach(async () => {
        [admin, alice, fakeToken1, fakeToken2] = await ethers.getSigners();

        // Deploy mock Chainlink feeds
        const MockFactory = await ethers.getContractFactory("MockV3Aggregator");
        mockETHFeed = (await MockFactory.deploy(8, ETH_PRICE)) as MockV3Aggregator;
        mockBTCFeed = (await MockFactory.deploy(8, BTC_PRICE)) as MockV3Aggregator;

        // Deploy oracle
        const OracleFactory = await ethers.getContractFactory("PriceOracle");
        oracle = (await OracleFactory.deploy(admin.address, STALENESS_THRESHOLD)) as PriceOracle;

        // Register ETH feed
        await oracle.connect(admin).setFeed(fakeToken1.address, await mockETHFeed.getAddress());
    });

    // ─── Deployment ─────────────────────────────────────────────────────────────
    describe("Deployment", () => {
        it("should set the correct staleness threshold", async () => {
            expect(await oracle.stalenessThreshold()).to.equal(STALENESS_THRESHOLD);
        });

        it("should grant DEFAULT_ADMIN_ROLE to admin", async () => {
            expect(await oracle.hasRole(ethers.ZeroHash, admin.address)).to.be.true;
        });

        it("should grant ORACLE_ADMIN to admin", async () => {
            expect(await oracle.hasRole(ORACLE_ADMIN, admin.address)).to.be.true;
        });

        it("should revert if admin is zero address", async () => {
            const Factory = await ethers.getContractFactory("PriceOracle");
            await expect(Factory.deploy(ethers.ZeroAddress, STALENESS_THRESHOLD))
                .to.be.revertedWithCustomError(oracle, "ZeroAddress");
        });
    });

    // ─── Feed Management ───────────────────────────────────────────────────────
    describe("Feed Management", () => {
        it("should register a feed and mark it active", async () => {
            expect(await oracle.isFeedActive(fakeToken1.address)).to.be.true;
        });

        it("should return the aggregator address via getFeed", async () => {
            expect(await oracle.getFeed(fakeToken1.address)).to.equal(await mockETHFeed.getAddress());
        });

        it("should emit FeedSet event on registration", async () => {
            await expect(
                oracle.connect(admin).setFeed(fakeToken2.address, await mockBTCFeed.getAddress())
            ).to.emit(oracle, "FeedSet")
                .withArgs(fakeToken2.address, await mockBTCFeed.getAddress());
        });

        it("should allow updating an existing feed to a new aggregator", async () => {
            await oracle.connect(admin).setFeed(fakeToken1.address, await mockBTCFeed.getAddress());
            expect(await oracle.getFeed(fakeToken1.address)).to.equal(await mockBTCFeed.getAddress());
        });

        it("should revert setFeed with zero asset address", async () => {
            await expect(
                oracle.connect(admin).setFeed(ethers.ZeroAddress, await mockETHFeed.getAddress())
            ).to.be.revertedWithCustomError(oracle, "ZeroAddress");
        });

        it("should revert setFeed with zero aggregator address", async () => {
            await expect(
                oracle.connect(admin).setFeed(fakeToken1.address, ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(oracle, "ZeroAddress");
        });

        it("should revert setFeed if caller lacks ORACLE_ADMIN", async () => {
            await expect(
                oracle.connect(alice).setFeed(fakeToken2.address, await mockBTCFeed.getAddress())
            ).to.be.revertedWithCustomError(oracle, "AccessControlUnauthorizedAccount");
        });

        it("should deactivate a feed", async () => {
            await oracle.connect(admin).deactivateFeed(fakeToken1.address);
            expect(await oracle.isFeedActive(fakeToken1.address)).to.be.false;
        });

        it("should emit FeedDeactivated event", async () => {
            await expect(oracle.connect(admin).deactivateFeed(fakeToken1.address))
                .to.emit(oracle, "FeedDeactivated")
                .withArgs(fakeToken1.address);
        });

        it("should revert deactivateFeed with zero address", async () => {
            await expect(oracle.connect(admin).deactivateFeed(ethers.ZeroAddress))
                .to.be.revertedWithCustomError(oracle, "ZeroAddress");
        });

        it("should revert deactivateFeed if caller lacks ORACLE_ADMIN", async () => {
            await expect(oracle.connect(alice).deactivateFeed(fakeToken1.address))
                .to.be.revertedWithCustomError(oracle, "AccessControlUnauthorizedAccount");
        });
    });

    // ─── Price Queries — Happy Path ────────────────────────────────────────────
    describe("Price Queries — Happy Path", () => {
        it("should return correct price for a registered asset (8 decimals)", async () => {
            const price = await oracle.getPrice(fakeToken1.address);
            expect(price).to.equal(ETH_PRICE);
        });

        it("should return correct price in WAD (18 decimals)", async () => {
            const priceWAD = await oracle.getPriceWAD(fakeToken1.address);
            expect(priceWAD).to.equal(ETH_PRICE * WAD_PRECISION);
        });

        it("should return updated price after feed updates", async () => {
            const newPrice = 2500_00000000n; // $2,500
            await mockETHFeed.updateAnswer(newPrice);
            expect(await oracle.getPrice(fakeToken1.address)).to.equal(newPrice);
        });

        it("should support multiple assets with different feeds", async () => {
            await oracle.connect(admin).setFeed(fakeToken2.address, await mockBTCFeed.getAddress());
            expect(await oracle.getPrice(fakeToken1.address)).to.equal(ETH_PRICE);
            expect(await oracle.getPrice(fakeToken2.address)).to.equal(BTC_PRICE);
        });
    });

    // ─── Staleness Protection ──────────────────────────────────────────────────
    describe("Staleness Protection", () => {
        it("should revert if price data is stale (older than threshold)", async () => {
            // Advance time past the staleness threshold
            await time.increase(STALENESS_THRESHOLD + 1);

            await expect(oracle.getPrice(fakeToken1.address))
                .to.be.revertedWithCustomError(oracle, "StalePrice");
        });

        it("should return valid price just before staleness threshold", async () => {
            // Advance time to just under the threshold
            await time.increase(STALENESS_THRESHOLD - 10);

            // Should still work
            const price = await oracle.getPrice(fakeToken1.address);
            expect(price).to.equal(ETH_PRICE);
        });

        it("should accept fresh price after stale period if feed updates", async () => {
            // Go stale
            await time.increase(STALENESS_THRESHOLD + 100);

            // Feed updates with fresh data
            await mockETHFeed.updateAnswer(2100_00000000n);

            // Now should work
            const price = await oracle.getPrice(fakeToken1.address);
            expect(price).to.equal(2100_00000000n);
        });

        it("should also reject stale prices on getPriceWAD", async () => {
            await time.increase(STALENESS_THRESHOLD + 1);
            await expect(oracle.getPriceWAD(fakeToken1.address))
                .to.be.revertedWithCustomError(oracle, "StalePrice");
        });
    });

    // ─── Sanity Checks — Invalid Prices ────────────────────────────────────────
    describe("Sanity Checks — Invalid Prices", () => {
        it("should revert on zero price", async () => {
            await mockETHFeed.updateAnswer(0);
            await expect(oracle.getPrice(fakeToken1.address))
                .to.be.revertedWithCustomError(oracle, "InvalidPrice");
        });

        it("should revert on negative price", async () => {
            await mockETHFeed.updateAnswer(-1);
            await expect(oracle.getPrice(fakeToken1.address))
                .to.be.revertedWithCustomError(oracle, "InvalidPrice");
        });

        it("should revert on zero price for getPriceWAD", async () => {
            await mockETHFeed.updateAnswer(0);
            await expect(oracle.getPriceWAD(fakeToken1.address))
                .to.be.revertedWithCustomError(oracle, "InvalidPrice");
        });
    });

    // ─── Inactive Feed ─────────────────────────────────────────────────────────
    describe("Inactive Feed", () => {
        it("should revert getPrice for deactivated feed", async () => {
            await oracle.connect(admin).deactivateFeed(fakeToken1.address);
            await expect(oracle.getPrice(fakeToken1.address))
                .to.be.revertedWithCustomError(oracle, "FeedNotActive");
        });

        it("should revert getPriceWAD for deactivated feed", async () => {
            await oracle.connect(admin).deactivateFeed(fakeToken1.address);
            await expect(oracle.getPriceWAD(fakeToken1.address))
                .to.be.revertedWithCustomError(oracle, "FeedNotActive");
        });

        it("should revert getPrice for unregistered asset", async () => {
            // fakeToken2 was never registered
            await expect(oracle.getPrice(fakeToken2.address))
                .to.be.revertedWithCustomError(oracle, "FeedNotActive");
        });

        it("should work again after re-registering a deactivated feed", async () => {
            await oracle.connect(admin).deactivateFeed(fakeToken1.address);
            // Re-register
            await mockETHFeed.updateAnswer(ETH_PRICE); // ensure fresh
            await oracle.connect(admin).setFeed(fakeToken1.address, await mockETHFeed.getAddress());
            expect(await oracle.getPrice(fakeToken1.address)).to.equal(ETH_PRICE);
        });
    });

    // ─── Staleness Threshold Management ─────────────────────────────────────────
    describe("Staleness Threshold Management", () => {
        it("should allow ORACLE_ADMIN to update staleness threshold", async () => {
            await oracle.connect(admin).setStalenessThreshold(7200);
            expect(await oracle.stalenessThreshold()).to.equal(7200);
        });

        it("should emit StalenessThresholdUpdated event", async () => {
            await expect(oracle.connect(admin).setStalenessThreshold(7200))
                .to.emit(oracle, "StalenessThresholdUpdated")
                .withArgs(STALENESS_THRESHOLD, 7200);
        });

        it("should revert if caller lacks ORACLE_ADMIN for threshold update", async () => {
            await expect(oracle.connect(alice).setStalenessThreshold(7200))
                .to.be.revertedWithCustomError(oracle, "AccessControlUnauthorizedAccount");
        });

        it("should now accept previously stale prices with longer threshold", async () => {
            // Advance 2 hours (beyond 1-hour default threshold)
            await time.increase(7200);

            // Should be stale with 1-hour threshold
            await expect(oracle.getPrice(fakeToken1.address))
                .to.be.revertedWithCustomError(oracle, "StalePrice");

            // Extend threshold to 3 hours
            await oracle.connect(admin).setStalenessThreshold(10800);

            // Now should work (price is only 2 hours old)
            const price = await oracle.getPrice(fakeToken1.address);
            expect(price).to.equal(ETH_PRICE);
        });
    });

    // ─── Feed Registration Validation ──────────────────────────────────────────
    describe("Feed Registration Validation", () => {
        it("should reject registering a feed that returns zero price", async () => {
            const MockFactory = await ethers.getContractFactory("MockV3Aggregator");
            const badFeed = await MockFactory.deploy(8, 0);

            await expect(
                oracle.connect(admin).setFeed(fakeToken2.address, await badFeed.getAddress())
            ).to.be.revertedWithCustomError(oracle, "InvalidPrice");
        });

        it("should reject registering a feed that returns negative price", async () => {
            const MockFactory = await ethers.getContractFactory("MockV3Aggregator");
            const badFeed = await MockFactory.deploy(8, -100);

            await expect(
                oracle.connect(admin).setFeed(fakeToken2.address, await badFeed.getAddress())
            ).to.be.revertedWithCustomError(oracle, "InvalidPrice");
        });
    });
});
