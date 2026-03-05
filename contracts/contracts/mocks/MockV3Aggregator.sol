// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  MockV3Aggregator
 * @notice A mock Chainlink AggregatorV3Interface for testing PriceOracle.
 *         Allows setting arbitrary prices, timestamps, and round data.
 */
contract MockV3Aggregator {
    uint8 public decimals;
    int256 public latestAnswer;
    uint256 public latestTimestamp;
    uint256 public latestRound;

    mapping(uint256 => int256) public getAnswer;
    mapping(uint256 => uint256) public getTimestamp;
    mapping(uint256 => uint256) private getStartedAt;

    constructor(uint8 _decimals, int256 _initialAnswer) {
        decimals = _decimals;
        _updateAnswer(_initialAnswer);
    }

    function updateAnswer(int256 _answer) external {
        _updateAnswer(_answer);
    }

    function updateRoundData(uint80 _roundId, int256 _answer, uint256 _timestamp, uint256 _startedAt) external {
        latestRound = _roundId;
        latestAnswer = _answer;
        latestTimestamp = _timestamp;
        getAnswer[_roundId] = _answer;
        getTimestamp[_roundId] = _timestamp;
        getStartedAt[_roundId] = _startedAt;
    }

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (uint80(latestRound), latestAnswer, getStartedAt[latestRound], latestTimestamp, uint80(latestRound));
    }

    function getRoundData(
        uint80 _roundId
    )
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (_roundId, getAnswer[_roundId], getStartedAt[_roundId], getTimestamp[_roundId], _roundId);
    }

    function description() external pure returns (string memory) {
        return "MockV3Aggregator";
    }

    function version() external pure returns (uint256) {
        return 0;
    }

    function _updateAnswer(int256 _answer) internal {
        latestAnswer = _answer;
        latestTimestamp = block.timestamp;
        latestRound++;
        getAnswer[latestRound] = _answer;
        getTimestamp[latestRound] = block.timestamp;
        getStartedAt[latestRound] = block.timestamp;
    }
}
