// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ElectionManager is Ownable {
    struct Election {
        string name;
        string description;
        uint256 startTime;
        uint256 endTime;
    }

    uint256 private _electionIds;
    mapping(uint256 => Election) public elections;
    mapping(uint256 => address[]) private _electionWhitelist;
    mapping(uint256 => uint256[]) private _electionCandidates;

    event ElectionCreated(
        uint256 indexed id,
        string name,
        string description,
        uint256 startTime,
        uint256 endTime,
        address[] whitelist
    );
    event CandidateRegistered(uint256 indexed electionId, uint256 indexed candidateId);

    modifier validElectionPeriod(uint256 startTime, uint256 endTime) {
        require(endTime > startTime, "End must be after start");
        require(endTime > block.timestamp, "End must be in future");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /// @notice Create a new election + seed the on‐chain whitelist
    function createElection(
        string calldata name,
        string calldata description,
        uint256 startTime,
        uint256 endTime,
        address[] calldata whitelist
    )
        external
        onlyOwner
        validElectionPeriod(startTime, endTime)
        returns (uint256)
    {
        _electionIds++;
        uint256 eid = _electionIds;

        elections[eid] = Election({
            name: name,
            description: description,
            startTime: startTime,
            endTime: endTime
        });

        // store the whitelist
        _electionWhitelist[eid] = whitelist;

        emit ElectionCreated(eid, name, description, startTime, endTime, whitelist);
        return eid;
    }

    /// @notice Register a candidate into an election
    function registerCandidateInElection(uint256 electionId, uint256 candidateId)
        external
        onlyOwner
    {
        require(bytes(elections[electionId].name).length != 0, "No such election");
        _electionCandidates[electionId].push(candidateId);
        emit CandidateRegistered(electionId, candidateId);
    }

    /// @notice Get the whitelist for an election
    function getWhitelist(uint256 electionId)
        external
        view
        returns (address[] memory)
    {
        return _electionWhitelist[electionId];
    }

    /// @notice Get candidate IDs
    function getElectionCandidates(uint256 electionId)
        external
        view
        returns (uint256[] memory)
    {
        return _electionCandidates[electionId];
    }

    /// @notice How many elections
    function electionCount() external view returns (uint256) {
        return _electionIds;
    }

    /// @notice Convenience getter
    function getElection(uint256 electionId)
        external
        view
        returns (Election memory)
    {
        require(bytes(elections[electionId].name).length != 0, "No such election");
        return elections[electionId];
    }
}
