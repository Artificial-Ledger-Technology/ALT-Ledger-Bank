// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";

/**
 * @title  ALTBankToken
 * @author Artificial Ledger Technology
 * @notice Native ERC-20 governance and utility token for the ALT-Ledger-Bank DeFi protocol.
 *         Ticker: ALT, Max Supply: 100,000,000 ALT
 *
 * @dev    Inherits:
 *           - ERC20           — standard fungible token
 *           - ERC20Burnable   — token holders can burn their own tokens
 *           - ERC20Permit     — gasless EIP-712 approvals (EIP-2612)
 *           - ERC20Votes      — on-chain snapshot voting delegation (EIP-5805)
 *           - AccessControl   — role-gated minting and admin operations
 *           - Nonces          — shared nonce tracking for Permit and Votes
 *
 *         Security Model:
 *           - Only MINTER_ROLE can mint new tokens (assigned to LendingPool post-deploy)
 *           - Hard cap of MAX_SUPPLY enforced via custom error — no integer overflow possible
 *           - Genesis 10% initial mint to admin for protocol liquidity seeding
 *           - Two-address zero check prevents bricking the contract at construction
 */
contract ALTBankToken is ERC20, ERC20Burnable, ERC20Permit, ERC20Votes, AccessControl {
    // ─── Roles ────────────────────────────────────────────────────────────────

    /// @notice Role that can mint new ALT tokens (intended: LendingPool reward distribution)
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // ─── Constants ─────────────────────────────────────────────────────────────

    /// @notice Absolute hard cap: 100,000,000 ALT (including 18 decimals)
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18;

    /// @notice 10% of MAX_SUPPLY minted to admin at genesis for protocol seeding
    uint256 public constant GENESIS_MINT = 10_000_000 * 10 ** 18;

    // ─── Custom Errors ─────────────────────────────────────────────────────────

    /**
     * @notice Reverts when a mint would push totalSupply above MAX_SUPPLY.
     * @param requested   Amount caller tried to mint.
     * @param available   Tokens remaining before cap is hit.
     */
    error MaxSupplyExceeded(uint256 requested, uint256 available);

    /// @notice Reverts when a zero address is passed to the constructor.
    error ZeroAddress();

    // ─── Events ───────────────────────────────────────────────────────────────

    /**
     * @notice Emitted when the MINTER_ROLE mints ALT tokens as protocol rewards.
     * @param to      Recipient address.
     * @param amount  Token amount minted (in wei).
     */
    event TokensMinted(address indexed to, uint256 amount);

    // ─── Constructor ───────────────────────────────────────────────────────────

    /**
     * @param admin  Address that receives DEFAULT_ADMIN_ROLE, MINTER_ROLE,
     *               and the 10M genesis mint. Must be non-zero.
     */
    constructor(address admin) ERC20("ALT Bank Token", "ALT") ERC20Permit("ALT Bank Token") {
        if (admin == address(0)) revert ZeroAddress();

        // Grant admin full control — they elect to delegate MINTER_ROLE to LendingPool
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);

        // Genesis mint: 10% to admin for initial protocol liquidity
        _mint(admin, GENESIS_MINT);
    }

    // ─── External Functions ────────────────────────────────────────────────────

    /**
     * @notice Mints ALT tokens as protocol rewards, capped at MAX_SUPPLY.
     * @dev    Callable exclusively by MINTER_ROLE (typically the LendingPool contract).
     *         Reverts with MaxSupplyExceeded before any state is mutated.
     * @param  to      Recipient of the newly minted tokens.
     * @param  amount  Amount to mint, in wei.
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        uint256 _totalSupply = totalSupply();
        if (_totalSupply + amount > MAX_SUPPLY) {
            revert MaxSupplyExceeded(amount, MAX_SUPPLY - _totalSupply);
        }
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    // ─── View Functions ────────────────────────────────────────────────────────

    /**
     * @notice Returns the remaining token supply available for minting.
     */
    function remainingMintable() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }

    // ─── Required Overrides (OZ 5.x) ──────────────────────────────────────────

    /**
     * @dev    Hook called on every token transfer/mint/burn.
     *         Must be overridden because both ERC20 and ERC20Votes define it.
     *         ERC20Votes uses this to update voting checkpoints.
     */
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    /**
     * @dev    Nonces are shared between ERC20Permit (EIP-2612) and ERC20Votes (EIP-5805).
     *         OZ 5.x requires this override when both extensions are used together.
     */
    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
