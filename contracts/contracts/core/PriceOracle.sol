// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../interfaces/IPriceOracle.sol";

/**
 * @title  PriceOracle
 * @author Artificial Ledger Technology
 * @notice Chainlink-based price feed aggregator with staleness protection,
 *         sanity checks, and admin-configurable asset→feed mapping.
 *
 * @dev    Security Model:
 *
 *         1. STALENESS PROTECTION
 *            Every price query checks that the Chainlink answer was updated
 *            within the configurable staleness threshold (default: 1 hour).
 *            Stale prices revert with StalePrice(asset, updatedAt) to prevent
 *            the LendingPool from using outdated collateral valuations.
 *
 *         2. SANITY CHECKS
 *            Zero or negative prices are rejected with InvalidPrice(asset, price).
 *            Chainlink feeds can return negative values during extreme market
 *            conditions or oracle malfunction — these MUST be caught.
 *
 *         3. FEED LIFECYCLE
 *            ORACLE_ADMIN can register, update, or deactivate feeds per asset.
 *            Deactivated feeds cause getPrice() to revert, effectively blocking
 *            operations on deprecated assets in the LendingPool.
 *
 *         4. DUAL PRECISION
 *            getPrice()    → 8-decimal Chainlink-native precision
 *            getPriceWAD() → 18-decimal WAD precision for DeFi math integration
 *
 *         Gas Optimization:
 *            - Feed data packed in a struct (address + bool = 1 slot via packing)
 *            - Single SLOAD to retrieve both feed address and active status
 *            - View functions only — no state mutations in price queries
 */
contract PriceOracle is IPriceOracle, AccessControl {
    // ─── Roles ────────────────────────────────────────────────────────────────

    /// @notice Role that can manage price feeds (set, deactivate, update threshold)
    bytes32 public constant ORACLE_ADMIN = keccak256("ORACLE_ADMIN");

    // ─── Constants ─────────────────────────────────────────────────────────────

    /// @notice Precision multiplier to convert 8-decimal Chainlink prices to 18-decimal WAD
    uint256 public constant WAD_PRECISION = 1e10;

    // ─── State Variables ──────────────────────────────────────────────────────

    /// @notice Packed struct for gas-efficient feed storage (1 storage slot)
    struct FeedConfig {
        AggregatorV3Interface aggregator; // 20 bytes
        bool active; // 1 byte → packed into same slot
    }

    /// @notice Asset address → Chainlink feed configuration
    mapping(address => FeedConfig) private _feeds;

    /// @notice Maximum age of a Chainlink answer before it's considered stale
    uint256 public stalenessThreshold;

    // ─── Constructor ───────────────────────────────────────────────────────────

    /**
     * @param admin              Address receiving DEFAULT_ADMIN_ROLE and ORACLE_ADMIN.
     * @param _stalenessThreshold  Maximum acceptable age for price data (e.g., 3600 = 1 hour).
     */
    constructor(address admin, uint256 _stalenessThreshold) {
        if (admin == address(0)) revert ZeroAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ORACLE_ADMIN, admin);

        stalenessThreshold = _stalenessThreshold;
    }

    // ─── Price Queries ─────────────────────────────────────────────────────────

    /**
     * @inheritdoc IPriceOracle
     * @dev    Returns the Chainlink-native 8-decimal USD price.
     *         Reverts if:
     *           - No active feed exists for the asset
     *           - The price is stale (older than stalenessThreshold)
     *           - The price is zero or negative
     */
    function getPrice(address asset) external view override returns (uint256) {
        return _getValidatedPrice(asset);
    }

    /**
     * @inheritdoc IPriceOracle
     * @dev    Returns the price scaled to 18 decimals (WAD) for DeFi math.
     *         Multiplies the 8-decimal Chainlink price by 1e10.
     */
    function getPriceWAD(address asset) external view override returns (uint256) {
        return _getValidatedPrice(asset) * WAD_PRECISION;
    }

    // ─── Feed Management ───────────────────────────────────────────────────────

    /**
     * @inheritdoc IPriceOracle
     * @dev    Registers or updates the Chainlink feed for an asset.
     *         Validates that neither the asset nor aggregator is the zero address.
     *         Performs a sanity call to latestRoundData() to ensure the feed is functional.
     */
    function setFeed(address asset, address aggregator) external override onlyRole(ORACLE_ADMIN) {
        if (asset == address(0)) revert ZeroAddress();
        if (aggregator == address(0)) revert ZeroAddress();

        // Sanity: verify the feed is functional before storing it
        AggregatorV3Interface feed = AggregatorV3Interface(aggregator);
        (, int256 price, , uint256 updatedAt, ) = feed.latestRoundData();
        if (price <= 0) revert InvalidPrice(asset, price);
        if (block.timestamp - updatedAt > stalenessThreshold) {
            revert StalePrice(asset, updatedAt);
        }

        _feeds[asset] = FeedConfig({ aggregator: feed, active: true });

        emit FeedSet(asset, aggregator);
    }

    /**
     * @inheritdoc IPriceOracle
     */
    function deactivateFeed(address asset) external override onlyRole(ORACLE_ADMIN) {
        if (asset == address(0)) revert ZeroAddress();
        _feeds[asset].active = false;
        emit FeedDeactivated(asset);
    }

    /**
     * @inheritdoc IPriceOracle
     */
    function isFeedActive(address asset) external view override returns (bool) {
        return _feeds[asset].active;
    }

    /**
     * @inheritdoc IPriceOracle
     */
    function getFeed(address asset) external view override returns (address) {
        return address(_feeds[asset].aggregator);
    }

    // ─── Admin Functions ───────────────────────────────────────────────────────

    /**
     * @notice Updates the staleness threshold for price data.
     * @param  newThreshold  New maximum age in seconds.
     */
    function setStalenessThreshold(uint256 newThreshold) external onlyRole(ORACLE_ADMIN) {
        uint256 old = stalenessThreshold;
        stalenessThreshold = newThreshold;
        emit StalenessThresholdUpdated(old, newThreshold);
    }

    // ─── Internal Functions ────────────────────────────────────────────────────

    /**
     * @dev    Core price retrieval with full validation:
     *         1. Checks feed is registered and active
     *         2. Queries Chainlink latestRoundData()
     *         3. Validates price is positive (not zero, not negative)
     *         4. Validates freshness against stalenessThreshold
     *
     * @param  asset  The ERC-20 token address to price.
     * @return price  The validated USD price with 8 decimal precision.
     */
    function _getValidatedPrice(address asset) internal view returns (uint256) {
        FeedConfig storage config = _feeds[asset];

        // 1. Feed must be registered and active
        if (!config.active) revert FeedNotActive(asset);

        // 2. Query Chainlink
        (, int256 answer, , uint256 updatedAt, ) = config.aggregator.latestRoundData();

        // 3. Sanity: reject zero or negative prices
        if (answer <= 0) revert InvalidPrice(asset, answer);

        // 4. Freshness: reject stale data
        if (block.timestamp - updatedAt > stalenessThreshold) {
            revert StalePrice(asset, updatedAt);
        }

        return uint256(answer);
    }
}
