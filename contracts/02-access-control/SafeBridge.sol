// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title SafeBridge
/// @notice Fix for the duplicate-signature bug: require signers to be strictly
///         increasing addresses, which forces every signer to be DISTINCT.
///         NOTE: this still cannot stop an attacker who steals THRESHOLD real
///         validator keys -- the remaining defences are off-chain
///         (decentralised operators, HSM custody, higher threshold, monitoring).
contract SafeBridge {
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

        address last = address(0);
        uint256 valid;
        for (uint256 i; i < sigs.length; i++) {
            address signer = digest.recover(sigs[i]);
            require(signer > last, "signers must be distinct & sorted"); // (OK) no duplicates
            last = signer;
            require(isValidator[signer], "not a validator");
            valid++;
        }
        require(valid >= threshold, "not enough approvals");

        processed[id] = true;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
    }
}
