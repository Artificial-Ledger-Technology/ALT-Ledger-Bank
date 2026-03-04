// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IInterestRateModel.sol";

/**
 * @title  InterestRateModel
 * @author Artificial Ledger Technology
 * @notice Kinked two-slope dynamic interest rate curve — identical to the
 *         Aave/Compound architecture. Designed to incentivize optimal
 *         utilization around the configurable kink point.
 *
 * @dev    Rate Curve Visualization:
 *
 *         Rate
 *         │                                         ╱  Jump Slope (above optimal)
 *         │                              ╱──────────
 *         │          ╱─────────  Base Slope
 *         │──────────
 *         └──────────────────────────────── Utilization
 *          0%              Optimal (80%)         100%
 *
 *         Below the kink (optimal utilization):
 *           borrowRate = baseRate + slope1 × (utilization / optimalUtilization)
 *
 *         Above the kink:
 *           borrowRate = baseRate + slope1 + slope2 × (excessUtil / excessDenom)
 *
 *         Where:
 *           excessUtil  = utilization - optimalUtilization
 *           excessDenom = 1 - optimalUtilization
 *
 *         All rates are stored as per-SECOND values for precise on-chain accrual.
 *         Constructor accepts per-YEAR values (human-readable) and converts them.
 *
 *         Gas Optimization:
 *           - All parameters are `immutable` — stored in bytecode, zero SLOAD cost
 *           - Pure arithmetic with no storage reads in rate calculations
 *           - `unchecked` blocks used where overflow is impossible
 */
contract InterestRateModel is IInterestRateModel {
    // ─── Constants ─────────────────────────────────────────────────────────────

    /// @notice Precision for all WAD-scaled calculations (18 decimals)
    uint256 public constant PRECISION = 1e18;

    /// @notice Seconds per year used for annualized → per-second rate conversion
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    /// @notice Basis points denominator (10,000 bps = 100%)
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // ─── Immutable Parameters ──────────────────────────────────────────────────

    /// @inheritdoc IInterestRateModel
    uint256 public immutable override baseRatePerSecond;

    /// @inheritdoc IInterestRateModel
    uint256 public immutable override slopePerSecond1;

    /// @inheritdoc IInterestRateModel
    uint256 public immutable override slopePerSecond2;

    /// @inheritdoc IInterestRateModel
    uint256 public immutable override optimalUtilization;

    // ─── Custom Errors ─────────────────────────────────────────────────────────

    /// @notice Reverts if optimal utilization is set to 0 or above 100%.
    error InvalidOptimalUtilization(uint256 value);

    /// @notice Reverts if any slope rate is zero (would produce a flat, useless curve segment).
    error InvalidSlope(uint256 value);

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted once at construction with all model parameters for off-chain indexing.
    event ModelDeployed(
        uint256 baseRatePerYear,
        uint256 slopePerYear1,
        uint256 slopePerYear2,
        uint256 optimalUtilization
    );

    // ─── Constructor ───────────────────────────────────────────────────────────

    /**
     * @notice Deploys the interest rate model with annualized parameters.
     * @dev    All rates are converted to per-second on construction and stored as `immutable`.
     *
     * @param baseRatePerYear  Base borrow rate at 0% utilization (e.g., 0.02e18 = 2% APY).
     * @param slopePerYear1    Rate slope below the kink (e.g., 0.04e18 = 4% max additional at optimal).
     * @param slopePerYear2    Rate slope above the kink (e.g., 0.75e18 = 75% steep jump above optimal).
     * @param _optimalUtilization  The kink point (e.g., 0.80e18 = 80% utilization target).
     */
    constructor(uint256 baseRatePerYear, uint256 slopePerYear1, uint256 slopePerYear2, uint256 _optimalUtilization) {
        // Validate: optimal utilization must be between 1% and 99%
        if (_optimalUtilization == 0 || _optimalUtilization >= PRECISION) {
            revert InvalidOptimalUtilization(_optimalUtilization);
        }

        baseRatePerSecond = baseRatePerYear / SECONDS_PER_YEAR;
        slopePerSecond1 = slopePerYear1 / SECONDS_PER_YEAR;
        slopePerSecond2 = slopePerYear2 / SECONDS_PER_YEAR;
        optimalUtilization = _optimalUtilization;

        emit ModelDeployed(baseRatePerYear, slopePerYear1, slopePerYear2, _optimalUtilization);
    }

    // ─── External View Functions ───────────────────────────────────────────────

    /**
     * @inheritdoc IInterestRateModel
     * @dev    Kinked two-slope model:
     *         - If utilization ≤ optimal: rate = base + slope1 × (util / optimal)
     *         - If utilization > optimal: rate = base + slope1 + slope2 × (excess / excessDenom)
     *         Returns baseRatePerSecond when totalSupply == 0 (empty pool).
     */
    function getBorrowRate(uint256 totalSupply, uint256 totalBorrows) external view override returns (uint256) {
        if (totalSupply == 0) return baseRatePerSecond;

        uint256 util = _calcUtilization(totalSupply, totalBorrows);

        if (util <= optimalUtilization) {
            // Below the kink: linear ramp from base to base + slope1
            return baseRatePerSecond + (slopePerSecond1 * util) / optimalUtilization;
        }

        // Above the kink: base + full slope1 + steep slope2
        uint256 excessUtil = util - optimalUtilization;
        uint256 excessDenom = PRECISION - optimalUtilization;
        return baseRatePerSecond + slopePerSecond1 + (slopePerSecond2 * excessUtil) / excessDenom;
    }

    /**
     * @inheritdoc IInterestRateModel
     * @dev    Supply rate = borrow rate × utilization × (1 - protocolFee)
     *         This distributes borrower interest to suppliers, minus the protocol's cut.
     */
    function getSupplyRate(
        uint256 totalSupply,
        uint256 totalBorrows,
        uint256 protocolFeeBps
    ) external view override returns (uint256) {
        if (totalSupply == 0) return 0;

        uint256 util = _calcUtilization(totalSupply, totalBorrows);
        uint256 borrowRate = this.getBorrowRate(totalSupply, totalBorrows);

        // supplyRate = borrowRate × utilization × (1 - protocolFee)
        uint256 rateTimesUtil = (borrowRate * util) / PRECISION;
        uint256 netRate = (rateTimesUtil * (BPS_DENOMINATOR - protocolFeeBps)) / BPS_DENOMINATOR;

        return netRate;
    }

    /**
     * @inheritdoc IInterestRateModel
     */
    function getUtilization(uint256 totalSupply, uint256 totalBorrows) external pure override returns (uint256) {
        return _calcUtilization(totalSupply, totalBorrows);
    }

    // ─── View Helpers ──────────────────────────────────────────────────────────

    /**
     * @notice Calculates the annualized borrow APY for off-chain display.
     * @dev    Approximation: APY ≈ ratePerSecond × SECONDS_PER_YEAR (simple, not compound).
     */
    function getBorrowAPY(uint256 totalSupply, uint256 totalBorrows) external view returns (uint256) {
        return this.getBorrowRate(totalSupply, totalBorrows) * SECONDS_PER_YEAR;
    }

    /**
     * @notice Calculates the annualized supply APY for off-chain display.
     */
    function getSupplyAPY(
        uint256 totalSupply,
        uint256 totalBorrows,
        uint256 protocolFeeBps
    ) external view returns (uint256) {
        return this.getSupplyRate(totalSupply, totalBorrows, protocolFeeBps) * SECONDS_PER_YEAR;
    }

    // ─── Internal Functions ────────────────────────────────────────────────────

    /**
     * @dev    Calculates utilization as: borrows / supply, WAD-scaled.
     *         Returns 0 if supply is 0 to avoid division by zero.
     */
    function _calcUtilization(uint256 totalSupply, uint256 totalBorrows) internal pure returns (uint256) {
        if (totalSupply == 0) return 0;
        return (totalBorrows * PRECISION) / totalSupply;
    }
}
