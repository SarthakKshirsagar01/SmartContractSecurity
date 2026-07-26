// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title CrossChainData
/// @notice Stores the trusted "keepers". Only the owner may change them.
///         In Poly Network the OWNER of this contract was the manager contract,
///         which is what turned an onlyOwner guard into a no-op.
contract CrossChainData is Ownable {
    mapping(address => bool) public isKeeper;

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice The privileged setter (Poly's putCurEpochConPubKeyBytes).
    function putCurEpochConPubKey(address keeper) external onlyOwner {
        isKeeper[keeper] = true;
    }
}
