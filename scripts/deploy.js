/**
 * deploy.js
 * ─────────────────────────────────────────────────────────────────
 * Script deploy Smart Contract ProductTraceability lên Hardhat local
 *
 * Cách chạy:
 *   1. Deploy lên Hardhat in-process (tạm thời, mất sau khi kết thúc):
 *      npx hardhat run scripts/deploy.js
 *
 *   2. Deploy lên Hardhat Node đang chạy (persistent):
 *      Terminal 1: npx hardhat node
 *      Terminal 2: npx hardhat run scripts/deploy.js --network localhost
 *
 *   3. Deploy lên Sepolia (sau khi cấu hình .env):
 *      npx hardhat run scripts/deploy.js --network sepolia
 * ─────────────────────────────────────────────────────────────────
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("========================================");
  console.log(" ProductTraceability - Deploy Script");
  console.log("========================================\n");

  // ── 1. Lấy thông tin deployer ───────────────────────────────────
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(" Deployer address :", deployer.address);
  console.log(
    " Deployer balance :",
    ethers.formatEther(balance),
    "ETH\n"
  );

  // ── 2. Deploy contract ──────────────────────────────────────────
  console.log(" Deploying ProductTraceability...");

  const ProductTraceability = await ethers.getContractFactory(
    "ProductTraceability"
  );
  const contract = await ProductTraceability.deploy();

  // Chờ contract được mine vào block
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();

  console.log(" Contract deployed successfully!\n");
  console.log(" Contract address :", contractAddress);
  console.log(" Transaction hash :", deployTx.hash);
  console.log(" Block number     :", deployTx.blockNumber ?? "pending");

  // ── 3. Verify nhanh bằng cách gọi owner() ──────────────────────
  const owner = await contract.owner();
  console.log("\n Contract owner   :", owner);

  // ── 4. Lưu địa chỉ contract ra file để các thành viên khác dùng ─
  const deployInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    contractName: "ProductTraceability",
    contractAddress: contractAddress,
    deployer: deployer.address,
    transactionHash: deployTx.hash,
    deployedAt: new Date().toISOString(),
  };

  // Ghi ra file deployments/deployment-info.json
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const outputPath = path.join(deploymentsDir, "deployment-info.json");
  fs.writeFileSync(outputPath, JSON.stringify(deployInfo, null, 2));
  console.log("\n Deployment info saved to:", outputPath);

}

// Xử lý lỗi chuẩn theo pattern Hardhat
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n Deploy failed:", error.message);
    process.exit(1);
  });
