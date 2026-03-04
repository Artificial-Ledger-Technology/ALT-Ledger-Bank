// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/interfaces/IERC4626.sol";

/**
 * @title  IVault
 * @author Artificial Ledger Technology
 * @notice Interface for ALTBankVault — the ERC-4626 tokenized deposit vault.
 */
interface IVault is IERC4626 {
    /// @notice Emitted when OPERATOR deposits yield into the vault, increasing share price.
    event YieldDeposited(uint256 amount, uint256 newTotalAssets, uint256 timestamp);

    /// @notice Emitted when a user performs an emergency withdrawal (available even when paused).
    event EmergencyWithdrawal(address indexed user, uint256 shares, uint256 assetsReceived, uint256 penaltyAmount);

    /// @notice Emitted when the treasury address is updated.
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    /// @notice Reverts when a zero address is passed where a valid address is required.
    error ZeroAddress();

    /// @notice Reverts when a zero amount is passed to deposit, withdraw, or yield functions.
    error ZeroAmount();

    /// @notice Reverts when a user tries emergency withdraw with insufficient shares.
    error InsufficientShares(uint256 requested, uint256 available);

    /**
     * @notice Emergency withdraw — available even when paused. Charges a penalty.
     * @param  shares  Number of vault shares to redeem.
     */
    function emergencyWithdraw(uint256 shares) external;

    /**
     * @notice OPERATOR deposits protocol yield, increasing totalAssets without minting shares.
     * @param  amount  Amount of underlying asset to deposit as yield.
     */
    function depositYield(uint256 amount) external;

    /**
     * @notice Updates the treasury address where penalties are sent.
     * @param  newTreasury  New treasury address.
     */
    function setTreasury(address newTreasury) external;

    /**
     * @notice Pauses the vault — blocks deposit/mint but never withdraw/redeem.
     */
    function pause() external;

    /**
     * @notice Unpauses the vault — re-enables deposit/mint.
     */
    function unpause() external;
}
