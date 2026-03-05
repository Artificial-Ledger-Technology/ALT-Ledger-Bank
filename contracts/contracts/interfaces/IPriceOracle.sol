// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  IPriceOracle
 * @author Artificial Ledger Technology
 * @notice Interface for the Chainlink-based price oracle used by the LendingPool.
 */
interface IPriceOracle {
    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted when a new Chainlink price feed is registered for an asset.
    event FeedSet(address indexed asset, address indexed aggregator);

    /// @notice Emitted when a price feed is deactivated for an asset.
    event FeedDeactivated(address indexed asset);

    /// @notice Emitted when the staleness threshold is updated.
    event StalenessThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    // ─── Custom Errors ─────────────────────────────────────────────────────────

    /// @notice Reverts when the Chainlink answer is older than the staleness threshold.
    error StalePrice(address asset, uint256 updatedAt);

    /// @notice Reverts when the Chainlink answer is zero or negative.
    error InvalidPrice(address asset, int256 price);

    /// @notice Reverts when no active feed is registered for the queried asset.
    error FeedNotActive(address asset);

    /// @notice Reverts when a zero address is provided.
    error ZeroAddress();

    // ─── Functions ─────────────────────────────────────────────────────────────

    /**
     * @notice Returns the latest USD price for an asset (8 decimal precision).
     * @param  asset  The ERC-20 token address to price.
     * @return price  USD price with 8 decimals (e.g., 2000_00000000 = $2,000.00).
     */
    function getPrice(address asset) external view returns (uint256);

    /**
     * @notice Returns the latest USD price normalized to 18 decimals (WAD).
     * @param  asset  The ERC-20 token address to price.
     * @return price  USD price with 18 decimals.
     */
    function getPriceWAD(address asset) external view returns (uint256);

    /**
     * @notice Registers a Chainlink AggregatorV3 price feed for an asset.
     * @param  asset       The ERC-20 token address.
     * @param  aggregator  The Chainlink AggregatorV3Interface contract address.
     */
    function setFeed(address asset, address aggregator) external;

    /**
     * @notice Deactivates the price feed for an asset.
     * @param  asset  The ERC-20 token address whose feed to deactivate.
     */
    function deactivateFeed(address asset) external;

    /**
     * @notice Returns whether a feed is currently active for the given asset.
     * @param  asset  The ERC-20 token address.
     * @return active True if a feed is registered and active.
     */
    function isFeedActive(address asset) external view returns (bool);

    /**
     * @notice Returns the Chainlink aggregator address for a given asset.
     * @param  asset  The ERC-20 token address.
     * @return aggregator The aggregator contract address (zero if not set).
     */
    function getFeed(address asset) external view returns (address);
}
