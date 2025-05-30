// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CandidateManager is Ownable {

    uint256 private _candidateIds;

    struct Candidate {
        uint256 id;
        string name;
        string description;
        bool exists;
    }

    mapping(uint256 => Candidate) public candidates;

    event CandidateAdded(uint256 indexed id, string candidateName, string description);

    constructor() Ownable(msg.sender) {}

    function addCandidate(
        string memory candidateName,
        string memory description
    ) external onlyOwner returns (uint256) {
        _candidateIds++;

        uint256 newCandidateId = _candidateIds;

        candidates[newCandidateId] = Candidate({
            id: newCandidateId,
            name: candidateName,
            description: description,
            exists: true
        });

        emit CandidateAdded(newCandidateId, candidateName, description);
        return newCandidateId;
    }

    function getCandidate(uint256 candidateId) external view returns (Candidate memory) {
        require(candidates[candidateId].exists, "Candidate does not exist");
        return candidates[candidateId];
    }

    function candidateExists(uint256 candidateId) external view returns (bool) {
        return candidates[candidateId].exists;
    }
}
