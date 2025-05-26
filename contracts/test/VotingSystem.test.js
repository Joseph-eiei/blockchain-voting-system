// test/VotingSystem.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Blockchain Voting System", function () {
  let owner, alice, bob, charlie;
  let VoterRegistry, CandidateManager, ElectionManager, Ballot, Results;
  let vr, cm, em, ballot, results;

  beforeEach(async function () {
    [owner, alice, bob, charlie] = await ethers.getSigners();

    // deploy VoterRegistry
    VoterRegistry = await ethers.getContractFactory("VoterRegistry");
    vr = await VoterRegistry.deploy();
    await vr.waitForDeployment();

    // deploy CandidateManager
    CandidateManager = await ethers.getContractFactory("CandidateManager");
    cm = await CandidateManager.deploy();
    await cm.waitForDeployment();

    // deploy ElectionManager
    ElectionManager = await ethers.getContractFactory("ElectionManager");
    em = await ElectionManager.deploy();
    await em.waitForDeployment();

    // deploy Ballot (owner passed for Ownable)
    Ballot = await ethers.getContractFactory("Ballot");
    ballot = await Ballot.deploy(vr.target, cm.target, em.target);
    await ballot.waitForDeployment();

    // hand off proxies/ownership
    await vr.transferOwnership(ballot.target);
    await cm.transferOwnership(ballot.target);
    await em.transferOwnership(ballot.target);

    // deploy Results helper
    Results = await ethers.getContractFactory("Results");
    results = await Results.deploy(ballot.target, em.target);
    await results.waitForDeployment();
  });

  describe("CandidateManager", function () {
    it("adds candidates and emits CandidateAdded", async function () {
      const tx = await cm.addCandidate("Alice", "DescA");
      const rcpt = await tx.wait();
      const ev = rcpt.events.find(e => e.event === "CandidateAdded");
      expect(ev.args.id).to.equal(1);

      const c = await cm.getCandidate(1);
      expect(c.name).to.equal("Alice");
      expect(c.description).to.equal("DescA");
    });

    it("prevents non-owners from adding", async function () {
      await expect(
        cm.connect(alice).addCandidate("Bob", "DescB")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("ElectionManager", function () {
    let start, end;

    beforeEach(async function () {
      const blockTs = (await ethers.provider.getBlock()).timestamp;
      start = blockTs + 10;
      end = start + 3600;
    });

    it("creates elections and emits ElectionCreated", async function () {
      const tx = await em.createElection("Election1", "D1", start, end);
      const rcpt = await tx.wait();
      const ev = rcpt.events.find(e => e.event === "ElectionCreated");
      expect(ev.args.id).to.equal(1);

      const e = await em.getElection(1);
      expect(e.name).to.equal("Election1");
      expect(e.description).to.equal("D1");
      expect(e.startTime).to.equal(start);
      expect(e.endTime).to.equal(end);
    });

    it("registers candidates into elections", async function () {
      // make election
      await (await em.createElection("E2", "D2", start, end)).wait();
      // add a candidate
      const rcpt1 = await (await cm.addCandidate("X", "dx")).wait();
      const candId = rcpt1.events.find(e => e.event === "CandidateAdded").args.id;
      // register into election
      await em.registerCandidateInElection(1, candId);
      const list = await em.getElectionCandidates(1);
      expect(list.map(x => x.toNumber())).to.include(candId.toNumber());
    });
  });

  describe("VoterRegistry & Ballot integration", function () {
    let electionId, start, end;

    beforeEach(async function () {
      // create an election that's already active
      const now = (await ethers.provider.getBlock()).timestamp;
      start = now - 10;
      end = now + 3600;
      const rcptE = await (await em.createElection("E3", "D3", start, end)).wait();
      electionId = rcptE.events.find(e => e.event === "ElectionCreated").args.id;

      // add a candidate
      const rcptC = await (await cm.addCandidate("C1", "DescC")).wait();
      const candId = rcptC.events.find(e => e.event === "CandidateAdded").args.id;
      await em.registerCandidateInElection(electionId, candId);

      // mint voting tokens
      await ballot.addVoters(electionId, [alice.address, bob.address]);
    });

    it("mints one token per voter on addVoters", async function () {
      expect(await vr.balanceOf(alice.address, electionId)).to.equal(1);
      expect(await vr.isEligible(electionId, alice.address)).to.be.true;
      // non-registered is not eligible
      expect(await vr.isEligible(electionId, charlie.address)).to.be.false;
    });

    it("allows a whitelisted voter to cast exactly one vote", async function () {
      // alice votes
      await ballot.connect(alice).vote(electionId, 1);
      // her token burned
      expect(await vr.balanceOf(alice.address, electionId)).to.equal(0);
      // hasVoted mapping flipped
      expect(await ballot.hasVoted(electionId, alice.address)).to.be.true;
      // vote count increased
      expect(await ballot.getVotes(electionId, 1)).to.equal(1);

      // cannot vote again
      await expect(
        ballot.connect(alice).vote(electionId, 1)
      ).to.be.revertedWith("No voting token");
    });

    it("rejects votes from non-whitelisted or without tokens", async function () {
      await expect(
        ballot.connect(charlie).vote(electionId, 1)
      ).to.be.revertedWith("No voting token");
    });

    it("rejects votes outside the time window", async function () {
      // warp past end
      await ethers.provider.send("evm_setNextBlockTimestamp", [end + 1]);
      await ethers.provider.send("evm_mine");
      await expect(
        ballot.connect(bob).vote(electionId, 1)
      ).to.be.revertedWith("Not active");
    });
  });

  describe("Results", function () {
    it("aggregates results correctly", async function () {
      // setup
      const now = (await ethers.provider.getBlock()).timestamp;
      const start = now - 10;
      const end   = now + 3600;
      const rcptE = await (await em.createElection("E4", "D4", start, end)).wait();
      const eid   = rcptE.events.find(e => e.event==="ElectionCreated").args.id;

      // one candidate
      const rcptC = await (await cm.addCandidate("Z", "dz")).wait();
      const cid   = rcptC.events.find(e => e.event==="CandidateAdded").args.id;
      await em.registerCandidateInElection(eid, cid);

      // mint & vote
      await ballot.addVoters(eid, [alice.address]);
      await ballot.connect(alice).vote(eid, cid);

      // fetch via results contract
      const counts = await results.getElectionResults(eid, [cid]);
      expect(counts[0]).to.equal(1);
    });
  });
});