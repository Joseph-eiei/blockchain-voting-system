// test/Ballot.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Ballot Contract", function () {
    let Ballot, ballot, owner, voter1, voter2, nonVoter;
    let voterRegistry, candidateManager, electionManager;
    let vrAddress, cmAddress, emAddress;

    const electionId = 1;
    const candidateId1 = 1;
    const candidateId2 = 2;
    let startTime, endTime;

    beforeEach(async function () {
        [owner, voter1, voter2, nonVoter] = await ethers.getSigners();

        // Deploy dependencies
        const VoterRegistry = await ethers.getContractFactory("VoterRegistry");
        voterRegistry = await VoterRegistry.deploy();
        vrAddress = await voterRegistry.getAddress();

        const CandidateManager = await ethers.getContractFactory("CandidateManager");
        candidateManager = await CandidateManager.deploy();
        cmAddress = await candidateManager.getAddress();
        await candidateManager.connect(owner).addCandidate("Alice", "Candidate Alice"); // ID 1
        await candidateManager.connect(owner).addCandidate("Bob", "Candidate Bob");   // ID 2

        const ElectionManager = await ethers.getContractFactory("ElectionManager");
        electionManager = await ElectionManager.deploy();
        emAddress = await electionManager.getAddress();

        // Deploy Ballot contract
        Ballot = await ethers.getContractFactory("Ballot");
        ballot = await Ballot.deploy(vrAddress, cmAddress, emAddress);

        // Configure VoterRegistry: set ballot contract address
        await voterRegistry.connect(owner).setBallotContract(await ballot.getAddress());

        await voterRegistry.connect(owner).transferOwnership(await ballot.getAddress());

        // Create an election
        const latestBlock = await ethers.provider.getBlock('latest');
        startTime = latestBlock.timestamp + 100; // Starts in 100 seconds
        endTime = startTime + 86400; // Ends 1 day after start
        await electionManager.connect(owner).createElection(
            "Test Election", "A test election", startTime, endTime, [voter1.address, voter2.address]
        );
        await electionManager.connect(owner).registerCandidateInElection(electionId, candidateId1);
        await electionManager.connect(owner).registerCandidateInElection(electionId, candidateId2);
    });

    describe("Deployment", function () {
        it("Should set the correct addresses for dependent contracts", async function () {
            expect(await ballot.vr()).to.equal(vrAddress);
            expect(await ballot.cm()).to.equal(cmAddress);
            expect(await ballot.em()).to.equal(emAddress);
            expect(await ballot.owner()).to.equal(owner.address);
        });
    });

    describe("addVoters", function () {
        it("Owner should be able to add voters (register them in VoterRegistry)", async function () {
            const votersToAdd = [voter1.address, voter2.address];
            await expect(ballot.connect(owner).addVoters(electionId, votersToAdd))
                .to.emit(ballot, "VotersAdded").withArgs(electionId, votersToAdd);

            // Check tokens in VoterRegistry
            expect(await voterRegistry.balanceOf(voter1.address, electionId)).to.equal(1);
            expect(await voterRegistry.balanceOf(voter2.address, electionId)).to.equal(1);
        });

        it("Non-owner should not be able to add voters", async function () {
            await expect(
                ballot.connect(voter1).addVoters(electionId, [voter1.address])
            ).to.be.revertedWithCustomError(ballot, "OwnableUnauthorizedAccount");
        });
    });

    describe("vote", function () {
        beforeEach(async function () {
            // Add voters and thus mint tokens
            await ballot.connect(owner).addVoters(electionId, [voter1.address, voter2.address]);
            // Fast forward to election active period
            await ethers.provider.send("evm_setNextBlockTimestamp", [startTime + 10]);
            await ethers.provider.send("evm_mine");
        });

        it("Eligible voter should be able to cast a vote", async function () {
            await expect(ballot.connect(voter1).vote(electionId, candidateId1))
                .to.emit(ballot, "VoteCasted")
                .withArgs(electionId, candidateId1, voter1.address);

            expect(await ballot.getVotes(electionId, candidateId1)).to.equal(1);
            expect(await voterRegistry.balanceOf(voter1.address, electionId)).to.equal(0); // Token should be burned
        });

        it("Should revert if voter has no voting token (not registered)", async function () {
            await expect(
                ballot.connect(nonVoter).vote(electionId, candidateId1)
            ).to.be.revertedWith("No voting token"); 
        });

        it("Should revert if election is not active (before start time)", async function () {
            const newElectionId = 2; // Use a different ID to avoid state interference
            const latestBlock = await ethers.provider.getBlock('latest');
            const futureStartTime = latestBlock.timestamp + 5000;
            const futureEndTime = futureStartTime + 1000;
            await electionManager.connect(owner).createElection("Future Elec", "Desc", futureStartTime, futureEndTime, [voter1.address]);
            await electionManager.connect(owner).registerCandidateInElection(newElectionId, candidateId1);
            
            // Add voter for this new election
            await ballot.connect(owner).addVoters(newElectionId, [voter1.address]);

            await expect(
                ballot.connect(voter1).vote(newElectionId, candidateId1)
            ).to.be.revertedWith("Not active");
        });
        
        it("Should revert if election is not active (after end time)", async function () {
            await ethers.provider.send("evm_setNextBlockTimestamp", [endTime + 100]); // Fast forward past end time
            await ethers.provider.send("evm_mine");

            await expect(
                ballot.connect(voter1).vote(electionId, candidateId1)
            ).to.be.revertedWith("Not active");
        });

        it("Should revert if candidate is not in the election", async function () {
            const invalidCandidateId = 99;
            await expect(
                ballot.connect(voter1).vote(electionId, invalidCandidateId)
            ).to.be.revertedWith("Candidate not in election");
        });

        it("Should revert if voter has already voted (no token left)", async function () {
            await ballot.connect(voter1).vote(electionId, candidateId1); // First vote
             await expect(
                ballot.connect(voter1).vote(electionId, candidateId2) // Second attempt
            ).to.be.revertedWith("No voting token"); 
        });
        
        it("getVotes should return correct vote count", async function () {
            await ballot.connect(voter1).vote(electionId, candidateId1);
            await ballot.connect(voter2).vote(electionId, candidateId1);
            expect(await ballot.getVotes(electionId, candidateId1)).to.equal(2);
            expect(await ballot.getVotes(electionId, candidateId2)).to.equal(0);
        });
    });
});
