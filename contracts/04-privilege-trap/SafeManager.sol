// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title SafeManager
/// @notice Fix: whitelist exactly which (target, function selector) pairs the
///         executor may call. Admin functions like putCurEpochConPubKey are never
///         whitelisted, so the privilege trap is closed (separation of privilege).
contract SafeManager {
    address public owner;
    mapping(address => mapping(bytes4 => bool)) public allowed;

    constructor() { owner = msg.sender; }

    function allow(address target, bytes4 selector) external {
        require(msg.sender == owner, "not owner");
        allowed[target][selector] = true;
    }

    function executeCrossChainTx(address target, bytes calldata data) external {
        require(data.length >= 4, "bad calldata");
        bytes4 selector = bytes4(data[:4]);
        require(allowed[target][selector], "target/selector not allowed"); // (OK) whitelist
        (bool ok, ) = target.call(data);
        require(ok, "cross-chain call failed");
    }
}
