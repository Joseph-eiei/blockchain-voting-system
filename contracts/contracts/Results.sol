// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Ballot.sol";
import "./ElectionManager.sol";
import "./CandidateManager.sol";

contract Results {
    Ballot public immutable ballot;
    ElectionManager public immutable em;
    CandidateManager public immutable cm;

    struct Result {
        uint256 candidateId;
        uint256 totalVotes;
    }

    constructor(
        address _ballot,
        address _em,
        address _cm
    ) {
        ballot = Ballot(_ballot);
        em     = ElectionManager(_em);
        cm     = CandidateManager(_cm);
    }

    /// @notice Fetch vote totals for a list of candidates in an election
    function getElectionResults(uint256 electionId, uint256[] memory candidateIds)
        external
        view
        returns (Result[] memory)
    {
        Result[] memory output = new Result[](candidateIds.length);
        for (uint i = 0; i < candidateIds.length; i++) {
            uint256 cid = candidateIds[i];
            // this calls Ballot.getVotes(...)
            uint256 tv  = ballot.getVotes(electionId, cid);
            output[i] = Result({ candidateId: cid, totalVotes: tv });
        }
        return output;
    }
}
