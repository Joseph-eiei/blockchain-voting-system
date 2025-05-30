const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VoterRegistry Contract", function () {
    let VoterRegistry, voterRegistry, owner, ballotContractSigner, voter1, voter2;
    const electionId = 1;

    beforeEach(async function () {
        [owner, ballotContractSigner, voter1, voter2] = await ethers.getSigners();
        VoterRegistry = await ethers.getContractFactory("VoterRegistry");
        voterRegistry = await VoterRegistry.deploy(); 
        await voterRegistry.connect(owner).setBallotContract(ballotContractSigner.address); 
    });

    describe("Deployment and Setup", function () {
        it("Should set the deployer as owner", async function () {
            expect(await voterRegistry.owner()).to.equal(owner.address);
        });

        it("Owner should be able to set the ballot contract address", async function () {
            await voterRegistry.connect(owner).setBallotContract(ballotContractSigner.address);
            expect(await voterRegistry.ballotContract()).to.equal(ballotContractSigner.address);
        });

        it("Non-owner should not be able to set the ballot contract address", async function () {
            await expect(
                voterRegistry.connect(voter1).setBallotContract(voter1.address)
            ).to.be.revertedWithCustomError(voterRegistry, "OwnableUnauthorizedAccount");
        });
    });

    describe("Registering Voters", function () {
        const votersToRegister = [];
        beforeEach(function(){
            votersToRegister[0] = voter1.address;
            votersToRegister[1] = voter2.address;
        })

        it("Owner should be able to register voters and mint tokens", async function () {
            await expect(voterRegistry.connect(owner).registerVoters(electionId, votersToRegister))
                .to.emit(voterRegistry, "VoterRegistered").withArgs(electionId, voter1.address) 
                .and.to.emit(voterRegistry, "VoterRegistered").withArgs(electionId, voter2.address); 

            expect(await voterRegistry.balanceOf(voter1.address, electionId)).to.equal(1); 
            expect(await voterRegistry.balanceOf(voter2.address, electionId)).to.equal(1);
        });

        it("Non-owner should not be able to register voters", async function () {
            await expect(
                voterRegistry.connect(voter1).registerVoters(electionId, [voter1.address])
            ).to.be.revertedWithCustomError(voterRegistry, "OwnableUnauthorizedAccount");
        });

        it("Registering an empty list of voters should do nothing and not revert", async function() {
            await expect(voterRegistry.connect(owner).registerVoters(electionId, [])).to.not.be.reverted;
        });
    });

    describe("Using Voting Token", function () {
        beforeEach(async function () {
            await voterRegistry.connect(owner).registerVoters(electionId, [voter1.address]);
        });

        it("Ballot contract should be able to use a voting token", async function () {
            expect(await voterRegistry.balanceOf(voter1.address, electionId)).to.equal(1);
            await expect(voterRegistry.connect(ballotContractSigner).useVotingToken(electionId, voter1.address))
                .to.emit(voterRegistry, "VotingTokenUsed") 
                .withArgs(electionId, voter1.address); 
            
            expect(await voterRegistry.balanceOf(voter1.address, electionId)).to.equal(0);
        });

        it("Should revert if a non-ballot contract tries to use a token", async function () {
            await expect(
                voterRegistry.connect(owner).useVotingToken(electionId, voter1.address)
            ).to.be.revertedWith("Not authorized"); 
        });

        it("Should revert if voter has no token", async function () {
             // voter2 was not registered
            await expect(
                voterRegistry.connect(ballotContractSigner).useVotingToken(electionId, voter2.address)
            ).to.be.revertedWith("No voting token available"); 
        });

        it("Should revert if voter has a token for a different electionId", async function() {
            const otherElectionId = 2;
            await voterRegistry.connect(owner).registerVoters(otherElectionId, [voter1.address]); // voter1 has token for electionId AND otherElectionId
            await expect(
                voterRegistry.connect(ballotContractSigner).useVotingToken(electionId + 5, voter1.address) // Trying to use for non-existent election token for voter1
            ).to.be.revertedWith("No voting token available");
        });
    });

    describe("isEligible", function () {
        it("Should return true if voter has a token for the election", async function () {
            await voterRegistry.connect(owner).registerVoters(electionId, [voter1.address]);
            expect(await voterRegistry.isEligible(electionId, voter1.address)).to.be.true; 
        });

        it("Should return false if voter does not have a token for the election", async function () {
            expect(await voterRegistry.isEligible(electionId, voter1.address)).to.be.false; 
        });

        it("Should return false after a token has been used", async function () {
            await voterRegistry.connect(owner).registerVoters(electionId, [voter1.address]);
            await voterRegistry.connect(ballotContractSigner).useVotingToken(electionId, voter1.address);
            expect(await voterRegistry.isEligible(electionId, voter1.address)).to.be.false; 
        });
    });
});
