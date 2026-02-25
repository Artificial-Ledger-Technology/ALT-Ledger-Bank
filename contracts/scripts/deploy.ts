import { ethers } from "hardhat";

/**
 * ALT-Ledger-Bank — Deployment Script
 *
 * Deploys all protocol contracts in correct dependency order:
 * 1. ALTBankToken         (ERC-20 governance token)
 * 2. InterestRateModel    (kinked rate curve)
 * 3. PriceOracle          (Chainlink wrapper)
 * 4. TimelockController   (governance execution delay)
 * 5. ALTBankVault         (ERC-4626 deposit vault)
 * 6. LendingPool          (borrow/supply/liquidate)
 * 7. ALTBankGovernance    (DAO voting)
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network localhost
 *   npx hardhat run scripts/deploy.ts --network sepolia
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════════");
  console.log("  ALT-Ledger-Bank — Protocol Deployment");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Deployer:  ${deployer.address}`);
  console.log(`  Network:   ${(await ethers.provider.getNetwork()).name}`);
  console.log(
    `  Balance:   ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`
  );
  console.log("═══════════════════════════════════════════════════════\n");

  // TODO: Phase 1 — Deploy contracts here in order
  // const Token = await ethers.getContractFactory("ALTBankToken");
  // const token = await Token.deploy(deployer.address);
  // await token.waitForDeployment();
  // console.log(`  ✅ ALTBankToken deployed to: ${await token.getAddress()}`);

  console.log("\n  ⏳ No contracts to deploy yet — complete Phase 1 first.");
  console.log("═══════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
