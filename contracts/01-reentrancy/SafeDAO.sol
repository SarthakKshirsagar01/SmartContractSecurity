// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SafeDAO
/// @notice The fix: Checks-Effects-Interactions (state updated BEFORE the call)
///         plus a reentrancy guard as defence in depth.
contract SafeDAO is ReentrancyGuard {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external nonReentrant {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "nothing to withdraw");

        balances[msg.sender] = 0; // (OK) EFFECTS before INTERACTIONS

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
    }

    function poolBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
