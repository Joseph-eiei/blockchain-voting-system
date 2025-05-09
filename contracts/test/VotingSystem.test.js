const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Blockchain Voting System", function () {
  let deployer, voter1, voter2, outsider;
  let voterRegistry, electionManager, candidateManager, ballot, results;

  beforeEach(async () => {
    [deployer, voter1, voter2, outsider] = await ethers.getSigners();

    // 1) VoterRegistry
    const VR = await ethers.getContractFactory("VoterRegistry");
    voterRegistry = await VR.deploy();
    await voterRegistry.waitForDeployment();

    // 2) ElectionManager
    const EM = await ethers.getContractFactory("ElectionManager");
    electionManager = await EM.deploy();
    await electionManager.waitForDeployment();

    // 3) CandidateManager
    const CM = await ethers.getContractFactory("CandidateManager");
    candidateManager = await CM.deploy();
    await candidateManager.waitForDeployment();

    // 4) Ballot
    const Ballot = await ethers.getContractFactory("Ballot");
    ballot = await Ballot.deploy(
      voterRegistry.target,
      candidateManager.target,
      electionManager.target
    );
    await ballot.waitForDeployment();

    // 5) Results
    const Results = await ethers.getContractFactory("Results");
    results = await Results.deploy(
      ballot.target,
      electionManager.target,
      candidateManager.target
    );
    await results.waitForDeployment();
  });

  describe("VoterRegistry (unit)", function () {
    it("only owner can register voters and tokens are minted", async () => {
      // happy path
      await expect(voterRegistry.registerVoters([voter1.address]))
        .to.emit(voterRegistry, "VoterRegistered")
        .withArgs(voter1.address);

      expect(await voterRegistry.isRegistered(voter1.address)).to.be.true;
      expect(await voterRegistry.balanceOf(voter1.address)).to.equal(
        ethers.parseUnits("1", 18)
      );

      // non-owner may not register
      await expect(
        voterRegistry.connect(voter1).registerVoters([outsider.address])
      ).to.be.revertedWithCustomError(voterRegistry, "OwnableUnauthorizedAccount");
    });

    it("burns token on useVotingToken and eligibility toggles", async () => {
      await voterRegistry.registerVoters([voter1.address]);
      expect(await voterRegistry.isEligible(voter1.address)).to.be.true;

      await expect(voterRegistry.useVotingToken(voter1.address))
        .to.emit(voterRegistry, "VotingTokenUsed")
        .withArgs(voter1.address);

      expect(await voterRegistry.isEligible(voter1.address)).to.be.false;
    });
  });

  describe("ElectionManager (unit)", function () {
    it("only owner can create election and periods must be valid", async () => {
      const now = (await ethers.provider.getBlock("latest")).timestamp;

      // invalid: end ≤ start
      await expect(
        electionManager.createElection("A", "B", now + 100, now + 50, [])
      ).to.be.revertedWith("End must be after start");

      // invalid: end in past
      await expect(
        electionManager.createElection("A", "B", now - 200, now - 100, [])
      ).to.be.revertedWith("End must be in future");
      
      // happy path
      await expect(
        electionManager.createElection("Test", "Desc", now - 10, now + 1000, [])
      )
        .to.emit(electionManager, "ElectionCreated")
        .withArgs(1, "Test", "Desc", now - 10, now + 1000, []);

      // non-owner may not create
      await expect(
        electionManager
          .connect(voter1)
          .createElection("X", "Y", now, now + 10, [])
      ).to.be.revertedWithCustomError(electionManager, "OwnableUnauthorizedAccount");
    });

    it("can register candidates into an election and list them", async () => {
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      await electionManager.createElection("E1", "", now - 10, now + 10, []);
      await expect(
        electionManager.registerCandidateInElection(1, 42)
      )
        .to.emit(electionManager, "CandidateRegistered")
        .withArgs(1, 42);

      expect(await electionManager.getElectionCandidates(1)).to.deep.equal([42]);
    });
  });

  describe("CandidateManager (unit)", function () {
    it("only owner can add candidates and they mint NFTs", async () => {
      await expect(
        candidateManager.addCandidate("Alice", "Desc", "uriA")
      )
        .to.emit(candidateManager, "CandidateAdded")
        .withArgs(1, "Alice", "uriA");

      const c = await candidateManager.getCandidate(1);
      expect(c.name).to.equal("Alice");

      // non-owner may not add
      await expect(
        candidateManager.connect(voter1).addCandidate("Bob", "", "uriB")
      ).to.be.revertedWithCustomError(
        candidateManager,
        "OwnableUnauthorizedAccount"
      );
    });
  });

  describe("Ballot & full flow (integration)", function () {
    beforeEach(async () => {
      // seed registry
      await voterRegistry.registerVoters([voter1.address, voter2.address]);
      await voterRegistry.transferOwnership(ballot.target);

      // create election
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      await electionManager.createElection(
        "Integration",
        "",
        now - 10,
        now + 1000,
        []
      );

      // mint candidates
      await candidateManager.addCandidate("A", "", "uA");
      await candidateManager.addCandidate("B", "", "uB");

      // link
      await electionManager.registerCandidateInElection(1, 1);
      await electionManager.registerCandidateInElection(1, 2);

      // whitelist
      await ballot.addVoters(1, [voter1.address, voter2.address]);
    });

    it("allows a whitelisted, registered voter to vote exactly once", async () => {
      expect(await ballot.getVotes(1, 1)).to.equal(0);

      // first vote
      await ballot.connect(voter1).vote(1, 1);
      expect(await ballot.getVotes(1, 1)).to.equal(1);

      // double-vote fails
      await expect(
        ballot.connect(voter1).vote(1, 2)
      ).to.be.revertedWith("Already voted");

      // outsider fails
      await expect(
        ballot.connect(outsider).vote(1, 1)
      ).to.be.revertedWith("Not whitelisted");

      // after endTime fails
      await ethers.provider.send("evm_increaseTime", [2000]);
      await ethers.provider.send("evm_mine");
      await expect(
        ballot.connect(voter2).vote(1, 2)
      ).to.be.revertedWith("Not active");
    });

    it("integrates with Results to fetch final tallies", async () => {
      await ballot.connect(voter1).vote(1, 1);
      await ballot.connect(voter2).vote(1, 2);

      await ethers.provider.send("evm_increaseTime", [2000]);
      await ethers.provider.send("evm_mine");

      const out = await results.getElectionResults(1, [1, 2]);
      expect(out[0].candidateId).to.equal(1);
      expect(out[0].totalVotes).to.equal(1);
      expect(out[1].candidateId).to.equal(2);
      expect(out[1].totalVotes).to.equal(1);
    });
  });
});
