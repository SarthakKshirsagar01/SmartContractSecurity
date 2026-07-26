// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Verifiers.sol";

/// @title SafeTokenBridge
/// @notice Fix: the trusted verifier is fixed at deploy time (immutable) and can
///         never be chosen by the caller. A forged VAA now fails verification.
contract SafeTokenBridge is ERC20 {
    IGuardianVerifier public immutable verifier;

    constructor(address _verifier) ERC20("Wrapped ETH", "wETH") {
        verifier = IGuardianVerifier(_verifier);
    }

    function mint(
        address to,
        uint256 amount,
        bytes32 vaaHash,
        bytes calldata sig
    ) external {
        require(verifier.verify(vaaHash, sig), "invalid VAA"); // (OK) trusted verifier only
        _mint(to, amount);
    }
}
