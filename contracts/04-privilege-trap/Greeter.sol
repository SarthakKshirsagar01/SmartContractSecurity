// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @notice A harmless business target, used to show the whitelisted (allowed)
///         cross-chain call still works on the SafeManager.
contract Greeter {
    string public lastMessage;
    function recordMessage(string calldata m) external {
        lastMessage = m;
    }
}
