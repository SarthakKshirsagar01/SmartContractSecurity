// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @notice A verifier answers: "was this VAA hash signed by a real guardian?"
interface IGuardianVerifier {
    function verify(bytes32 vaaHash, bytes calldata sig) external view returns (bool);
}

/// @notice The genuine verifier: recovers the signer and checks it is THE guardian.
contract RealVerifier is IGuardianVerifier {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public immutable guardian;
    constructor(address _guardian) { guardian = _guardian; }

    function verify(bytes32 vaaHash, bytes calldata sig) external view returns (bool) {
        return vaaHash.toEthSignedMessageHash().recover(sig) == guardian;
    }
}

/// @notice The attacker's fake verifier -- always says "valid".
contract FakeVerifier is IGuardianVerifier {
    function verify(bytes32, bytes calldata) external pure returns (bool) {
        return true; // (!) rubber-stamps anything
    }
}
