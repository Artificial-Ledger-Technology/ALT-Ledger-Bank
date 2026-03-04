// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  IInterestRateModel
 * @author Artificial Ledger Technology
 * @notice Interface for the kinked two-slope interest rate model used by the LendingPool.
 */
interface IInterestRateModel {
    /**
     * @notice Returns the current borrow rate per second based on pool utilization.
     * @param  totalSupply   Total assets supplied to the pool.
     * @param  totalBorrows  Total assets borrowed from the pool.
     * @return borrowRate    The borrow rate per second, scaled to 1e18 (WAD).
     */
    function getBorrowRate(uint256 totalSupply, uint256 totalBorrows) external view returns (uint256);

    /**
     * @notice Returns the current supply rate per second, net of protocol fee.
     * @param  totalSupply     Total assets supplied to the pool.
     * @param  totalBorrows    Total assets borrowed from the pool.
     * @param  protocolFeeBps  Protocol fee in basis points (e.g., 1000 = 10%).
     * @return supplyRate      The supply rate per second, scaled to 1e18 (WAD).
     */
    function getSupplyRate(
        uint256 totalSupply,
        uint256 totalBorrows,
        uint256 protocolFeeBps
    ) external view returns (uint256);

    /**
     * @notice Returns the current utilization rate of the pool.
     * @param  totalSupply   Total assets supplied to the pool.
     * @param  totalBorrows  Total assets borrowed from the pool.
     * @return utilization   Utilization rate scaled to 1e18 (e.g., 0.80e18 = 80%).
     */
    function getUtilization(uint256 totalSupply, uint256 totalBorrows) external pure returns (uint256);

    /**
     * @notice Returns the optimal utilization threshold (the kink point).
     * @return The optimal utilization, scaled to 1e18.
     */
    function optimalUtilization() external view returns (uint256);

    /**
     * @notice Returns the base rate per second.
     */
    function baseRatePerSecond() external view returns (uint256);

    /**
     * @notice Returns the slope 1 rate per second (below optimal).
     */
    function slopePerSecond1() external view returns (uint256);

    /**
     * @notice Returns the slope 2 rate per second (above optimal).
     */
    function slopePerSecond2() external view returns (uint256);
}
