const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Results Contract", function () {
    let Results, results, owner, voter1, voter2;
    let ballot, voterRegistry, candidateManager, electionManager;
    let ballotAddress, vrAddress, cmAddress, emAddress; // Added vrAddress for clarity

    const electionId = 1;
    const candidateId1 = 1; // Alice
    const candidateId2 = 2; // Bob
    const candidateId3 = 3; // Charlie (not voted for)

    beforeEach(async function () {
        [owner, voter1, voter2] = await ethers.getSigners();

        // Deploy dependencies
        const VoterRegistry = await ethers.getContractFactory("VoterRegistry");
        voterRegistry = await VoterRegistry.deploy();
        vrAddress = await voterRegistry.getAddress();

        const CandidateManager = await ethers.getContractFactory("CandidateManager");
        candidateManager = await CandidateManager.deploy();
        cmAddress = await candidateManager.getAddress();
        await candidateManager.connect(owner).addCandidate("Alice", "Candidate Alice"); // ID 1
        await candidateManager.connect(owner).addCandidate("Bob", "Candidate Bob");     // ID 2
        await candidateManager.connect(owner).addCandidate("Charlie", "Candidate Charlie"); // ID 3

        const ElectionManager = await ethers.getContractFactory("ElectionManager");
        electionManager = await ElectionManager.deploy();
        emAddress = await electionManager.getAddress();

        const Ballot = await ethers.getContractFactory("Ballot");
        ballot = await Ballot.deploy(vrAddress, cmAddress, emAddress);
        ballotAddress = await ballot.getAddress();

        // Configure VoterRegistry
        await voterRegistry.connect(owner).setBallotContract(ballotAddress);

        // *** FIX: Transfer ownership of VoterRegistry to Ballot contract ***
        await voterRegistry.connect(owner).transferOwnership(ballotAddress);

        // Create an election and register candidates
        const latestBlock = await ethers.provider.getBlock('latest');
        const startTime = latestBlock.timestamp + 10; 
        const endTime = startTime + 86400; 
        await electionManager.connect(owner).createElection(
            "Main Election", "Election for results", startTime, endTime, [voter1.address, voter2.address]
        );
        await electionManager.connect(owner).registerCandidateInElection(electionId, candidateId1);
        await electionManager.connect(owner).registerCandidateInElection(electionId, candidateId2);
        await electionManager.connect(owner).registerCandidateInElection(electionId, candidateId3);

        // Add voters (mint tokens) via Ballot contract
        // This call will now work due to ownership transfer
        await ballot.connect(owner).addVoters(electionId, [voter1.address, voter2.address]);

        // Cast some votes
        await ethers.provider.send("evm_setNextBlockTimestamp", [startTime + 1]);
        await ethers.provider.send("evm_mine");
        await ballot.connect(voter1).vote(electionId, candidateId1); // voter1 votes for Alice
        await ballot.connect(voter2).vote(electionId, candidateId2); // voter2 votes for Bob

        // Deploy Results contract
        Results = await ethers.getContractFactory("Results");
        results = await Results.deploy(ballotAddress, emAddress, cmAddress);
    });

    describe("Deployment", function () {
        it("Should set the correct addresses for dependent contracts", async function () {
            expect(await results.ballot()).to.equal(ballotAddress);
            expect(await results.em()).to.equal(emAddress);
            expect(await results.cm()).to.equal(cmAddress);
        });
    });

    describe("getElectionResults", function () {
        it("Should return correct vote totals for specified candidates", async function () {
            const candidatesToQuery = [candidateId1, candidateId2, candidateId3];
            const electionResults = await results.getElectionResults(electionId, candidatesToQuery);

            expect(electionResults.length).to.equal(3);

            expect(electionResults[0].candidateId).to.equal(ethers.toBigInt(candidateId1));
            expect(electionResults[0].totalVotes).to.equal(ethers.toBigInt(1));

            expect(electionResults[1].candidateId).to.equal(ethers.toBigInt(candidateId2));
            expect(electionResults[1].totalVotes).to.equal(ethers.toBigInt(1));

            expect(electionResults[2].candidateId).to.equal(ethers.toBigInt(candidateId3));
            expect(electionResults[2].totalVotes).to.equal(ethers.toBigInt(0));
        });

        it("Should return correct results if a candidate has no votes", async function () {
            const candidatesToQuery = [candidateId3]; // Only Charlie
            const electionResults = await results.getElectionResults(electionId, candidatesToQuery);

            expect(electionResults.length).to.equal(1);
            expect(electionResults[0].candidateId).to.equal(ethers.toBigInt(candidateId3));
            expect(electionResults[0].totalVotes).to.equal(ethers.toBigInt(0));
        });

        it("Should return an empty array if an empty list of candidates is provided", async function () {
            const candidatesToQuery = [];
            const electionResults = await results.getElectionResults(electionId, candidatesToQuery);
            expect(electionResults.length).to.equal(0);
        });
        
        it("Should correctly call Ballot.getVotes for each candidate", async function () {
            const candidatesToQuery = [candidateId1];
            const electionResults = await results.getElectionResults(electionId, candidatesToQuery);
            expect(electionResults[0].totalVotes).to.equal(await ballot.getVotes(electionId, candidateId1));
        });
    });
});