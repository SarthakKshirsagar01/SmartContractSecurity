// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title VulnerableManager (Poly Network EthCrossChainManager, simplified)
/// @notice Executes cross-chain instructions.
///         VULNERABILITY: it will call ANY target with ANY calldata. Because this
///         manager is the OWNER of CrossChainData, an attacker can make it invoke
///         the onlyOwner setter -- the guard passes because the caller IS the owner.
contract VulnerableManager {
    function executeCrossChainTx(address target, bytes calldata data) external {
        (bool ok, ) = target.call(data); // (!) unrestricted target + calldata
        require(ok, "cross-chain call failed");
    }
}
