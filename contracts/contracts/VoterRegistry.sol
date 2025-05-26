// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VoterRegistry is ERC1155, Ownable {

    event VoterRegistered(uint256 indexed electionId, address indexed voter);
    event VotingTokenUsed(uint256 indexed electionId, address indexed voter);

    address public ballotContract;

    constructor() ERC1155("") Ownable(msg.sender) {}

    function setBallotContract(address _b) external onlyOwner {
        ballotContract = _b;
    }

    /// @notice Owner registers voters and mints each exactly 1 token for the given electionId
    function registerVoters(uint256 electionId, address[] calldata voters) external onlyOwner {
        for (uint256 i = 0; i < voters.length; i++) {
            _mint(voters[i], electionId, 1, "");
            emit VoterRegistered(electionId, voters[i]);
        }
    }

    /// @notice Ballot contract burns a token when a vote is cast
    function useVotingToken(uint256 electionId, address voter) external {
        require(msg.sender == ballotContract, "Not authorized");
        require(balanceOf(voter, electionId) >= 1, "No voting token available");
        _burn(voter, electionId, 1);
        emit VotingTokenUsed(electionId, voter);
    }

    /// @notice True if the address still holds a token for the given electionId (i.e. hasn’t voted yet)
    function isEligible(uint256 electionId, address voter) external view returns (bool) {
        return balanceOf(voter, electionId) >= 1;
    }
}
