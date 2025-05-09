// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ElectionManager.sol";
import "./CandidateManager.sol";
import "./VoterRegistry.sol";

contract Ballot is Ownable {
    ElectionManager public immutable em;
    CandidateManager public immutable cm;
    VoterRegistry    public immutable vr;

    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => bool)) public eligible;
    mapping(uint256 => mapping(uint256 => uint256)) private _votes;

    event VotersAdded(uint256 indexed electionId, address[] voters);
    event VoteCasted(uint256 indexed electionId, uint256 indexed candidateId, address voter);

    constructor(address _vr, address _cm, address _em) Ownable(msg.sender) {
        vr = VoterRegistry(_vr);
        cm = CandidateManager(_cm);
        em = ElectionManager(_em);
    }

    /// @notice Seed the on‐chain whitelist
    function addVoters(uint256 electionId, address[] calldata voters) external onlyOwner {
        // sanity check
        ElectionManager.Election memory e = em.getElection(electionId);
        require(bytes(e.name).length != 0, "Election does not exist");

        for (uint i = 0; i < voters.length; i++) {
            eligible[electionId][voters[i]] = true;
        }
        emit VotersAdded(electionId, voters);
    }

    /// @notice Cast a vote
    function vote(uint256 electionId, uint256 candidateId) external {
        require(eligible[electionId][msg.sender], "Not whitelisted");
        require(vr.isRegistered(msg.sender),      "Not registered voter");

        ElectionManager.Election memory e = em.getElection(electionId);
        require(block.timestamp >= e.startTime && block.timestamp <= e.endTime, "Not active");

        uint256[] memory cands = em.getElectionCandidates(electionId);
        bool valid = false;
        for (uint i; i < cands.length; i++) {
            if (cands[i] == candidateId) {
                valid = true;
                break;
            }
        }
        require(valid, "Candidate not in election");
        require(!hasVoted[electionId][msg.sender], "Already voted");

        _votes[electionId][candidateId] += 1;
        hasVoted[electionId][msg.sender] = true;
        emit VoteCasted(electionId, candidateId, msg.sender);
    }

    function getVotes(uint256 electionId, uint256 candidateId)
        external
        view
        returns (uint256)
    {
        return _votes[electionId][candidateId];
    }
}
