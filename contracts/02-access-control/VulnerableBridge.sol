// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title VulnerableBridge (Ronin-style validator multisig)
/// @notice Withdrawals require THRESHOLD validator signatures.
///         VULNERABILITY: it counts signatures without checking they come from
///         DISTINCT validators -> one compromised key can sign THRESHOLD times.
///         (It also cannot help if an attacker simply steals THRESHOLD real keys
///          -- that is the actual Ronin lesson: key custody, not code.)
contract VulnerableBridge {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    mapping(address => bool) public isValidator;
    uint256 public threshold;
    mapping(bytes32 => bool) public processed;

    constructor(address[] memory validators, uint256 _threshold) {
        for (uint256 i; i < validators.length; i++) isValidator[validators[i]] = true;
        threshold = _threshold;
    }

    receive() external payable {}

    function withdraw(
        address to,
        uint256 amount,
        uint256 nonce,
        bytes[] calldata sigs
    ) external {
        bytes32 id = keccak256(abi.encode(to, amount, nonce));
        require(!processed[id], "already processed");

        bytes32 digest = id.toEthSignedMessageHash();

        uint256 valid;
        for (uint256 i; i < sigs.length; i++) {
            address signer = digest.recover(sigs[i]);
            // (!) no distinctness check -> duplicates all count
            if (isValidator[signer]) valid++;
        }
        require(valid >= threshold, "not enough approvals");

        processed[id] = true;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
    }
}
