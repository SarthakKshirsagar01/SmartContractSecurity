// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Verifiers.sol";

/// @title VulnerableTokenBridge (Wormhole-class bug, modelled in Solidity)
/// @notice Mints wrapped tokens once a VAA is "verified".
///         VULNERABILITY: the verifier address is supplied by the CALLER and never
///         checked -- exactly like Wormhole trusting a caller-supplied account as
///         proof. The attacker passes a FakeVerifier and mints from nothing.
contract VulnerableTokenBridge is ERC20 {
    constructor() ERC20("Wrapped ETH", "wETH") {}

    function mint(
        address to,
        uint256 amount,
        address verifier,     // (!) caller-controlled "proof source"
        bytes32 vaaHash,
        bytes calldata sig
    ) external {
        require(IGuardianVerifier(verifier).verify(vaaHash, sig), "invalid VAA");
        _mint(to, amount);
    }
}
