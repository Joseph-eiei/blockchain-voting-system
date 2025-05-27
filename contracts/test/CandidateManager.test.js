const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CandidateManager Contract", function () {
    let CandidateManager, candidateManager, owner, addr1;

    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();
        CandidateManager = await ethers.getContractFactory("CandidateManager");
        candidateManager = await CandidateManager.deploy(); // [cite: 24]
    });

    describe("Deployment", function () {
        it("Should set the deployer as owner", async function () {
            expect(await candidateManager.owner()).to.equal(owner.address);
        });
    });

    describe("Adding Candidates", function () {
        it("Should allow owner to add a candidate", async function () {
            const name = "Candidate A";
            const description = "Description A";
            
            await expect(candidateManager.connect(owner).addCandidate(name, description))
                .to.emit(candidateManager, "CandidateAdded") // [cite: 26]
                .withArgs(1, name, description);

            const candidate = await candidateManager.candidates(1); // [cite: 23]
            expect(candidate.id).to.equal(1); // [cite: 25]
            expect(candidate.name).to.equal(name);
            expect(candidate.description).to.equal(description);
            expect(candidate.exists).to.be.true;
        });

        it("Should correctly increment candidate IDs", async function () {
            await candidateManager.connect(owner).addCandidate("Candidate A", "Desc A");
            const tx = await candidateManager.connect(owner).addCandidate("Candidate B", "Desc B");
            const receipt = await tx.wait();
            const event = receipt.logs.find(e => e.eventName === 'CandidateAdded');
            const candidateId = event.args[0];
            expect(candidateId).to.equal(2); // [cite: 25]

            const candidate = await candidateManager.candidates(2);
            expect(candidate.name).to.equal("Candidate B");
        });

        it("Should prevent non-owner from adding a candidate", async function () {
            await expect(
                candidateManager.connect(addr1).addCandidate("Candidate X", "Desc X")
            ).to.be.revertedWithCustomError(candidateManager, "OwnableUnauthorizedAccount");
        });
    });

    describe("Getting Candidates", function () {
        beforeEach(async function () {
            await candidateManager.connect(owner).addCandidate("Candidate 1", "Info 1");
        });

        it("Should return a candidate if exists", async function () {
            const candidate = await candidateManager.getCandidate(1); // [cite: 27]
            expect(candidate.id).to.equal(1);
            expect(candidate.name).to.equal("Candidate 1");
            expect(candidate.exists).to.be.true;
        });

        it("Should revert if trying to get a non-existent candidate", async function () {
            await expect(candidateManager.getCandidate(99)).to.be.revertedWith( // [cite: 27]
                "Candidate does not exist"
            );
        });
    });

    describe("Checking Candidate Existence", function () {
        beforeEach(async function () {
            await candidateManager.connect(owner).addCandidate("Candidate Check", "Info Check");
        });

        it("Should return true if candidate exists", async function () {
            expect(await candidateManager.candidateExists(1)).to.be.true; // [cite: 28]
        });

        it("Should return false if candidate does not exist", async function () {
            expect(await candidateManager.candidateExists(99)).to.be.false; // [cite: 28]
        });
    });
});