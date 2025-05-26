// scripts/deploy.js
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying from:", deployer.address);

  // 1️⃣ VoterRegistry
  const VR = await hre.ethers.getContractFactory("VoterRegistry");
  const vr = await VR.deploy();
  await vr.waitForDeployment();
  console.log("VoterRegistry:", vr.target);

  // 2️⃣ ElectionManager
  const EM = await hre.ethers.getContractFactory("ElectionManager");
  const em = await EM.deploy();
  await em.waitForDeployment();
  console.log("ElectionManager:", em.target);

  // 3️⃣ CandidateManager
  const CM = await hre.ethers.getContractFactory("CandidateManager");
  const cm = await CM.deploy();
  await cm.waitForDeployment();
  console.log("CandidateManager:", cm.target);

  // 4️⃣ Ballot  ← now passing three args: vr, cm, em
  const Ballot = await hre.ethers.getContractFactory("Ballot");
  const ballot = await Ballot.deploy(
    vr.target,
    cm.target,
    em.target
  );
  await ballot.waitForDeployment();
  console.log("Ballot:", ballot.target);

  // 5️⃣ Results
  const R = await hre.ethers.getContractFactory("Results");
  const results = await R.deploy(
    ballot.target,
    em.target,
    cm.target
  );
  await results.waitForDeployment();
  console.log("Results:", results.target);

  console.log("\n✅ Deployment complete!");
  await vr.setBallotContract(ballot.target);
  console.log("VoterRegistry: ballotContract set to", ballot.target);
  await vr.transferOwnership(ballot.target);
  console.log("VoterRegistry ownership transferred to Ballot");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
