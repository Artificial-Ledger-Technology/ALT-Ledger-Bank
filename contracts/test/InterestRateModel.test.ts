import { expect } from "chai";
import { ethers } from "hardhat";
import { InterestRateModel } from "../typechain-types";

describe("InterestRateModel", function () {
    // ─── Recommended Parameters (from spec) ─────────────────────────────────────
    const BASE_RATE_PER_YEAR = ethers.parseEther("0.02");     // 2% APY
    const SLOPE_PER_YEAR_1 = ethers.parseEther("0.04");     // 4% slope below kink
    const SLOPE_PER_YEAR_2 = ethers.parseEther("0.75");     // 75% steep jump above kink
    const OPTIMAL_UTILIZATION = ethers.parseEther("0.80");     // 80% kink

    const PRECISION = ethers.parseEther("1");                  // 1e18
    const SECONDS_PER_YEAR = 365n * 24n * 60n * 60n;          // 31,536,000

    let model: InterestRateModel;

    beforeEach(async () => {
        const Factory = await ethers.getContractFactory("InterestRateModel");
        model = (await Factory.deploy(
            BASE_RATE_PER_YEAR,
            SLOPE_PER_YEAR_1,
            SLOPE_PER_YEAR_2,
            OPTIMAL_UTILIZATION
        )) as InterestRateModel;
    });

    // ─── Deployment ─────────────────────────────────────────────────────────────
    describe("Deployment", () => {
        it("should store correct baseRatePerSecond (immutable)", async () => {
            const expected = BASE_RATE_PER_YEAR / SECONDS_PER_YEAR;
            expect(await model.baseRatePerSecond()).to.equal(expected);
        });

        it("should store correct slopePerSecond1 (immutable)", async () => {
            const expected = SLOPE_PER_YEAR_1 / SECONDS_PER_YEAR;
            expect(await model.slopePerSecond1()).to.equal(expected);
        });

        it("should store correct slopePerSecond2 (immutable)", async () => {
            const expected = SLOPE_PER_YEAR_2 / SECONDS_PER_YEAR;
            expect(await model.slopePerSecond2()).to.equal(expected);
        });

        it("should store correct optimalUtilization", async () => {
            expect(await model.optimalUtilization()).to.equal(OPTIMAL_UTILIZATION);
        });

        it("should emit ModelDeployed event on construction", async () => {
            const Factory = await ethers.getContractFactory("InterestRateModel");
            const deployedModel = await Factory.deploy(
                BASE_RATE_PER_YEAR,
                SLOPE_PER_YEAR_1,
                SLOPE_PER_YEAR_2,
                OPTIMAL_UTILIZATION
            );
            const receipt = await deployedModel.deploymentTransaction()!.wait();
            // Verify event was emitted by checking logs exist
            expect(receipt!.logs.length).to.be.gte(1);
        });

        it("should revert if optimalUtilization is 0", async () => {
            const Factory = await ethers.getContractFactory("InterestRateModel");
            await expect(
                Factory.deploy(BASE_RATE_PER_YEAR, SLOPE_PER_YEAR_1, SLOPE_PER_YEAR_2, 0n)
            ).to.be.revertedWithCustomError(model, "InvalidOptimalUtilization");
        });

        it("should revert if optimalUtilization >= 100%", async () => {
            const Factory = await ethers.getContractFactory("InterestRateModel");
            await expect(
                Factory.deploy(BASE_RATE_PER_YEAR, SLOPE_PER_YEAR_1, SLOPE_PER_YEAR_2, PRECISION)
            ).to.be.revertedWithCustomError(model, "InvalidOptimalUtilization");
        });
    });

    // ─── Utilization Calculation ────────────────────────────────────────────────
    describe("Utilization", () => {
        it("should return 0% utilization when totalBorrows is 0", async () => {
            const util = await model.getUtilization(ethers.parseEther("1000000"), 0n);
            expect(util).to.equal(0n);
        });

        it("should return 0 when totalSupply is 0", async () => {
            const util = await model.getUtilization(0n, 0n);
            expect(util).to.equal(0n);
        });

        it("should return 50% utilization correctly", async () => {
            const supply = ethers.parseEther("1000000");
            const borrows = ethers.parseEther("500000");
            const util = await model.getUtilization(supply, borrows);
            expect(util).to.equal(ethers.parseEther("0.5"));
        });

        it("should return 80% utilization (at the kink)", async () => {
            const supply = ethers.parseEther("1000000");
            const borrows = ethers.parseEther("800000");
            const util = await model.getUtilization(supply, borrows);
            expect(util).to.equal(ethers.parseEther("0.8"));
        });

        it("should return 100% utilization when fully borrowed", async () => {
            const supply = ethers.parseEther("1000000");
            const borrows = ethers.parseEther("1000000");
            const util = await model.getUtilization(supply, borrows);
            expect(util).to.equal(PRECISION);
        });
    });

    // ─── Borrow Rate ────────────────────────────────────────────────────────────
    describe("Borrow Rate", () => {
        it("should return baseRate when totalSupply is 0 (empty pool)", async () => {
            const rate = await model.getBorrowRate(0n, 0n);
            expect(rate).to.equal(BASE_RATE_PER_YEAR / SECONDS_PER_YEAR);
        });

        it("should return baseRate when utilization is 0%", async () => {
            const supply = ethers.parseEther("1000000");
            const rate = await model.getBorrowRate(supply, 0n);
            // At 0% util: rate = base + slope1 × 0 = base
            expect(rate).to.equal(BASE_RATE_PER_YEAR / SECONDS_PER_YEAR);
        });

        it("should return correct rate at 50% utilization (below kink)", async () => {
            const supply = ethers.parseEther("1000000");
            const borrows = ethers.parseEther("500000");
            const rate = await model.getBorrowRate(supply, borrows);

            // At 50% util: rate = base + slope1 × (0.5 / 0.8)
            const utilRatio = (ethers.parseEther("0.5") * PRECISION) / OPTIMAL_UTILIZATION;
            const expectedPerSecond = BASE_RATE_PER_YEAR / SECONDS_PER_YEAR
                + (SLOPE_PER_YEAR_1 / SECONDS_PER_YEAR * ethers.parseEther("0.5")) / OPTIMAL_UTILIZATION;

            expect(rate).to.be.closeTo(expectedPerSecond, 1n);
        });

        it("should return base + slope1 at exactly the kink (80%)", async () => {
            const supply = ethers.parseEther("1000000");
            const borrows = ethers.parseEther("800000");
            const rate = await model.getBorrowRate(supply, borrows);

            // At 80% util (kink): rate = base + slope1 (full)
            const expected = BASE_RATE_PER_YEAR / SECONDS_PER_YEAR + SLOPE_PER_YEAR_1 / SECONDS_PER_YEAR;
            expect(rate).to.equal(expected);
        });

        it("should return steep rate at 90% utilization (above kink)", async () => {
            const supply = ethers.parseEther("1000000");
            const borrows = ethers.parseEther("900000");
            const rate = await model.getBorrowRate(supply, borrows);

            // Above kink rate should be significantly higher than at kink
            const rateAtKink = await model.getBorrowRate(supply, ethers.parseEther("800000"));
            expect(rate).to.be.gt(rateAtKink);
        });

        it("should return maximum rate at 100% utilization", async () => {
            const supply = ethers.parseEther("1000000");
            const borrows = ethers.parseEther("1000000");
            const rate = await model.getBorrowRate(supply, borrows);

            // At 100%: rate = base + slope1 + slope2
            const expected = BASE_RATE_PER_YEAR / SECONDS_PER_YEAR
                + SLOPE_PER_YEAR_1 / SECONDS_PER_YEAR
                + SLOPE_PER_YEAR_2 / SECONDS_PER_YEAR;

            expect(rate).to.equal(expected);
        });

        it("should produce monotonically increasing rates as utilization rises", async () => {
            const supply = ethers.parseEther("1000000");
            const utilizations = [0, 10, 20, 40, 60, 80, 85, 90, 95, 100];
            let previousRate = 0n;

            for (const pct of utilizations) {
                const borrows = ethers.parseEther((pct * 10000).toString());
                const rate = await model.getBorrowRate(supply, borrows);
                expect(rate).to.be.gte(previousRate, `Rate should increase at ${pct}%`);
                previousRate = rate;
            }
        });
    });

    // ─── Supply Rate ─────────────────────────────────────────────────────────────
    describe("Supply Rate", () => {
        const protocolFeeBps = 1000n; // 10% protocol fee

        it("should return 0 supply rate when totalSupply is 0", async () => {
            const rate = await model.getSupplyRate(0n, 0n, protocolFeeBps);
            expect(rate).to.equal(0n);
        });

        it("should return 0 supply rate when utilization is 0", async () => {
            const rate = await model.getSupplyRate(ethers.parseEther("1000000"), 0n, protocolFeeBps);
            expect(rate).to.equal(0n);
        });

        it("should return supply rate less than borrow rate (protocol fee deducted)", async () => {
            const supply = ethers.parseEther("1000000");
            const borrows = ethers.parseEther("500000");
            const borrowRate = await model.getBorrowRate(supply, borrows);
            const supplyRate = await model.getSupplyRate(supply, borrows, protocolFeeBps);

            // Supply rate = borrow rate × utilization × (1 - fee) — always less than borrow rate
            expect(supplyRate).to.be.lt(borrowRate);
            expect(supplyRate).to.be.gt(0n);
        });

        it("should return higher supply rate with 0% protocol fee", async () => {
            const supply = ethers.parseEther("1000000");
            const borrows = ethers.parseEther("500000");
            const rateWithFee = await model.getSupplyRate(supply, borrows, 1000n);
            const rateNoFee = await model.getSupplyRate(supply, borrows, 0n);

            expect(rateNoFee).to.be.gt(rateWithFee);
        });

        it("should return 0 supply rate with 100% protocol fee (10000 bps)", async () => {
            const supply = ethers.parseEther("1000000");
            const borrows = ethers.parseEther("500000");
            const rate = await model.getSupplyRate(supply, borrows, 10000n);
            expect(rate).to.equal(0n);
        });
    });

    // ─── APY Helpers ────────────────────────────────────────────────────────────
    describe("APY Helpers", () => {
        it("should return annualized borrow APY", async () => {
            const supply = ethers.parseEther("1000000");
            const borrows = ethers.parseEther("800000"); // at kink
            const apy = await model.getBorrowAPY(supply, borrows);

            // APY ≈ (base + slope1) per year = 0.02 + 0.04 = 0.06 = 6%
            const expectedAPY = BASE_RATE_PER_YEAR + SLOPE_PER_YEAR_1;
            // Allow small rounding error from integer division
            expect(apy).to.be.closeTo(expectedAPY, ethers.parseEther("0.001"));
        });

        it("should return annualized supply APY", async () => {
            const supply = ethers.parseEther("1000000");
            const borrows = ethers.parseEther("800000");
            const protocolFeeBps = 1000n; // 10%

            const supplyAPY = await model.getSupplyAPY(supply, borrows, protocolFeeBps);
            const borrowAPY = await model.getBorrowAPY(supply, borrows);

            // Supply APY should be less than borrow APY (fee + utilization factor)
            expect(supplyAPY).to.be.lt(borrowAPY);
            expect(supplyAPY).to.be.gt(0n);
        });
    });

    // ─── Edge Cases ─────────────────────────────────────────────────────────────
    describe("Edge Cases", () => {
        it("should handle very small amounts without reverting", async () => {
            const rate = await model.getBorrowRate(1n, 1n);
            expect(rate).to.be.gt(0n);
        });

        it("should handle very large supplies without overflow", async () => {
            const supply = ethers.parseEther("1000000000000"); // 1 trillion
            const borrows = ethers.parseEther("500000000000");  // 500 billion
            const rate = await model.getBorrowRate(supply, borrows);
            expect(rate).to.be.gt(0n);
        });

        it("should return consistent results across multiple calls (pure function)", async () => {
            const supply = ethers.parseEther("1000000");
            const borrows = ethers.parseEther("500000");
            const rate1 = await model.getBorrowRate(supply, borrows);
            const rate2 = await model.getBorrowRate(supply, borrows);
            expect(rate1).to.equal(rate2);
        });
    });
});
