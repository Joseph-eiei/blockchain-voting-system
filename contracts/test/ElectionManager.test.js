const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("ElectionManager Contract", function () {
    let ElectionManager, electionManager, owner, addr1, acc2, acc3; // Added acc2, acc3 for clarity
    let candidateManager; 
    let whitelistedAccounts;
    let startTime, endTime;

    beforeEach(async function () {
        [owner, addr1, acc2, acc3] = await ethers.getSigners(); // Ensure acc2, acc3 are defined
        whitelistedAccounts = [acc2.address, acc3.address];

        ElectionManager = await ethers.getContractFactory("ElectionManager");
        electionManager = await ElectionManager.deploy();

        const CandidateManager = await ethers.getContractFactory("CandidateManager");
        candidateManager = await CandidateManager.deploy();
        await candidateManager.connect(owner).addCandidate("Cand1", "Desc1"); // id 1
        await candidateManager.connect(owner).addCandidate("Cand2", "Desc2"); // id 2


        const latestBlock = await ethers.provider.getBlock('latest');
        startTime = latestBlock.timestamp + 100; 
        endTime = startTime + 86400; 
    });

    describe("Deployment", function () {
        it("Should set the deployer as owner", async function () {
            expect(await electionManager.owner()).to.equal(owner.address);
        });
    });

    describe("Creating Elections", function () {
        it("Should allow owner to create an election with valid parameters", async function () {
            const name = "Presidential Election";
            const description = "Vote for the next president";
            
            await expect(
                electionManager.connect(owner).createElection( // [cite: 35]
                    name,
                    description,
                    startTime,
                    endTime,
                    whitelistedAccounts
                )
            ).to.emit(electionManager, "ElectionCreated") // [cite: 32, 38]
             .withArgs(1, name, description, startTime, endTime, whitelistedAccounts);
            
            const election = await electionManager.elections(1); // [cite: 31]
            expect(election.name).to.equal(name); // [cite: 30]
            expect(election.description).to.equal(description); // [cite: 30]
            expect(election.startTime).to.equal(startTime);
            expect(election.endTime).to.equal(endTime);

            expect(await electionManager.electionCount()).to.equal(1); // [cite: 36, 42]
            expect(await electionManager.getWhitelist(1)).to.deep.equal(whitelistedAccounts); // [cite: 37, 40]
        });

        it("Should revert if end time is not after start time", async function () {
            const invalidEndTime = startTime - 1;
            await expect(
                electionManager.connect(owner).createElection(
                    "Fail Election", "Desc", startTime, invalidEndTime, whitelistedAccounts
                )
            ).to.be.revertedWith("End must be after start"); // [cite: 34]
        });

        it("Should revert if end time is not in the future", async function () {
            const latestBlock = await ethers.provider.getBlock('latest');
            const pastEndTime = latestBlock.timestamp - 100;
            const validStartTime = pastEndTime - 86400;
             await expect(
                electionManager.connect(owner).createElection(
                    "Fail Election", "Desc", validStartTime, pastEndTime, whitelistedAccounts
                )
            ).to.be.revertedWith("End must be in future"); // [cite: 34]
        });

        it("Should prevent non-owner from creating an election", async function () {
            await expect(
                electionManager.connect(addr1).createElection(
                    "Non-Owner Election", "Desc", startTime, endTime, whitelistedAccounts
                )
            ).to.be.revertedWithCustomError(electionManager, "OwnableUnauthorizedAccount");
        });

        it("Should correctly increment election IDs", async function () {
             await electionManager.connect(owner).createElection("Elec 1", "D1", startTime, endTime, []);
             const tx = await electionManager.connect(owner).createElection("Elec 2", "D2", startTime, endTime + 10, []); // [cite: 36]
             const receipt = await tx.wait();
             const event = receipt.logs.find(e => e.eventName === 'ElectionCreated');
             const electionId = event.args[0];
             expect(electionId).to.equal(2);
             expect(await electionManager.electionCount()).to.equal(2); // [cite: 42]
        });
    });

    describe("Registering Candidates in Election", function () {
        let electionId;
        beforeEach(async function () {
            // Ensure election is created with ID 1 for these tests for predictability
            const tx = await electionManager.connect(owner).createElection("Test Elec", "Desc", startTime, endTime, []);
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.constructor.name === 'EventLog' && log.eventName === 'ElectionCreated');
            electionId = event.args.id; // Make sure to get 'id' from event.args
            expect(electionId).to.equal(1); // Explicitly check if electionId is 1 as expected
        });

        it("Should allow owner to register a candidate in an existing election", async function () {
            const candidateIdToRegister = 1; // This is a JS number
            await expect(electionManager.connect(owner).registerCandidateInElection(electionId, candidateIdToRegister))
                .to.emit(electionManager, "CandidateRegistered")
                .withArgs(electionId, candidateIdToRegister);
            
            const candidates = await electionManager.getElectionCandidates(electionId);
            // *** FIX: Compare BigInt with BigInt ***
            expect(candidates).to.include(ethers.toBigInt(candidateIdToRegister));
        });

        it("Should revert if trying to register a candidate in a non-existent election", async function () {
            await expect(
                electionManager.connect(owner).registerCandidateInElection(99, 1) 
            ).to.be.revertedWith("No such election");
        });

        it("Should prevent non-owner from registering a candidate", async function () {
            await expect(
                electionManager.connect(addr1).registerCandidateInElection(electionId, 1)
            ).to.be.revertedWithCustomError(electionManager, "OwnableUnauthorizedAccount");
        });

        it("Should allow multiple candidates to be registered", async function () {
             const cand1 = 1;
             const cand2 = 2;
             await electionManager.connect(owner).registerCandidateInElection(electionId, cand1);
             await electionManager.connect(owner).registerCandidateInElection(electionId, cand2);
             const candidates = await electionManager.getElectionCandidates(electionId);
             // This was already correct using ethers.toBigInt for deep.equal
             expect(candidates).to.deep.equal([ethers.toBigInt(cand1), ethers.toBigInt(cand2)]);
        });
    });

    describe("Getters", function () {
        let electionId;
        const name = "Getter Election";
        const cand1 = 1; // JS number
        const cand2 = 2; // JS number

        beforeEach(async function () {
            const tx = await electionManager.connect(owner).createElection(name, "Desc", startTime, endTime, whitelistedAccounts);
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.constructor.name === 'EventLog' && log.eventName === 'ElectionCreated');
            electionId = event.args.id;
            expect(electionId).to.equal(1); // Assuming this is the first election created in this describe block's scope

            await electionManager.connect(owner).registerCandidateInElection(electionId, cand1);
        });

        it("getWhitelist should return the correct whitelist", async function () {
            expect(await electionManager.getWhitelist(electionId)).to.deep.equal(whitelistedAccounts);
        });

        it("getElectionCandidates should return correct candidate IDs", async function () {
            await electionManager.connect(owner).registerCandidateInElection(electionId, cand2);
             // Ensure comparison with BigInts if using .include or specific order in .deep.equal
            expect(await electionManager.getElectionCandidates(electionId)).to.deep.equal([ethers.toBigInt(cand1), ethers.toBigInt(cand2)]);
        });
        
        it("getElection should return correct election details", async function () {
            const election = await electionManager.getElection(electionId);
            expect(election.name).to.equal(name);
            expect(election.startTime).to.equal(startTime);
        });

        it("getElection should revert for a non-existent election", async function () {
            await expect(electionManager.getElection(99)).to.be.revertedWith("No such election");
        });

        it("electionCount should return the correct number of elections", async function () {
             expect(await electionManager.electionCount()).to.equal(1);
             const latestBlock = await ethers.provider.getBlock('latest');
             const sTime = latestBlock.timestamp + 100;
             const eTime = sTime + 100;
             await electionManager.connect(owner).createElection("Another Elec", "D", sTime, eTime, []);
             expect(await electionManager.electionCount()).to.equal(2);
        });
    });
});