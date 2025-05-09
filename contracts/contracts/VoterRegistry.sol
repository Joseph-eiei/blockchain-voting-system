// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VoterRegistry is ERC20, Ownable {
    // Tracks who’s been registered
    mapping(address => bool) private registeredVoters;

    event VoterRegistered(address indexed voter);
    event VotingTokenUsed(address indexed voter);

    constructor() ERC20("VotingToken", "VOTE") Ownable(msg.sender) {}

    /// @notice Owner registers voters and mints each exactly 1 token
    function registerVoters(address[] calldata voters) external onlyOwner {
        for (uint256 i = 0; i < voters.length; i++) {
            address v = voters[i];
            require(!registeredVoters[v], "Voter already registered");
            registeredVoters[v] = true;
            _mint(v, 1 * 10 ** decimals());
            emit VoterRegistered(v);
        }
    }

    /// @notice Owner burns a token when a vote is cast
    function useVotingToken(address voter) external onlyOwner {
        uint256 amt = 1 * 10 ** decimals();
        require(balanceOf(voter) >= amt, "No voting token available");
        _burn(voter, amt);
        emit VotingTokenUsed(voter);
    }

    /// @notice True if the address has ever been registered
    function isRegistered(address voter) external view returns (bool) {
        return registeredVoters[voter];
    }

    /// @notice True if the address still holds a token (i.e. hasn’t voted yet)
    function isEligible(address voter) external view returns (bool) {
        return balanceOf(voter) >= 1 * 10 ** decimals();
    }
}
