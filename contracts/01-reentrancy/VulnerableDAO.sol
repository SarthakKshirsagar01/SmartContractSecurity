// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title VulnerableDAO
/// @notice Reproduces the 2016 "The DAO" reentrancy bug.
///         The external call happens BEFORE the balance is updated,
///         so the receiver can re-enter withdraw() while the ledger is stale.
contract VulnerableDAO {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "nothing to withdraw");

        // (!) VULNERABILITY: external call FIRST -> hands control to the caller
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");

        // state is updated LAST -> re-entered before this line runs
        balances[msg.sender] = 0;
    }

    function poolBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
