const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lab 2 | Access Control - Ronin Bridge", function () {
  async function deployBridge(contractName) {
    const [owner, validator1, validator2, validator3, attacker, user] =
      await ethers.getSigners();

    const validators = [
      validator1.address,
      validator2.address,
      validator3.address,
    ];

    const Bridge = await ethers.getContractFactory(contractName);
    const bridge = await Bridge.deploy(validators, 3);
    await bridge.waitForDeployment();

    await owner.sendTransaction({
      to: await bridge.getAddress(),
      value: ethers.parseEther("10"),
    });

    return {
      bridge,
      owner,
      validator1,
      validator2,
      validator3,
      attacker,
      user,
    };
  }

  async function createMessage(to, amount, nonce) {
    const id = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256", "uint256"],
        [to, amount, nonce],
      ),
    );
    return id;
  }

  describe("Deployment", function () {
    it("sets threshold correctly", async function () {
      const { bridge } = await deployBridge("VulnerableBridge");
      expect(await bridge.threshold()).to.equal(3);
    });

    it("registers validators", async function () {
      const { bridge, validator1, validator2, validator3 } = await deployBridge(
        "VulnerableBridge",
      );

      expect(await bridge.isValidator(validator1.address)).to.equal(true);
      expect(await bridge.isValidator(validator2.address)).to.equal(true);
      expect(await bridge.isValidator(validator3.address)).to.equal(true);
    });
  });

  describe("VULNERABLE Bridge", function () {
    it("allows duplicate signatures from one validator", async function () {
      const { bridge, validator1, attacker } = await deployBridge(
        "VulnerableBridge",
      );

      const amount = ethers.parseEther("5");
      const nonce = 1;

      const id = await createMessage(attacker.address, amount, nonce);

      const sig = await validator1.signMessage(ethers.getBytes(id));
      const sigs = [sig, sig, sig];

      await bridge.withdraw(attacker.address, amount, nonce, sigs);

      expect(
        await ethers.provider.getBalance(await bridge.getAddress()),
      ).to.equal(ethers.parseEther("5"));
    });
  });

  describe("SAFE Bridge", function () {
    it("rejects duplicate signatures", async function () {
      const { bridge, validator1, attacker } = await deployBridge("SafeBridge");

      const amount = ethers.parseEther("5");
      const nonce = 1;

      const id = await createMessage(attacker.address, amount, nonce);

      const sig = await validator1.signMessage(ethers.getBytes(id));
      const sigs = [sig, sig, sig];

      await expect(
        bridge.withdraw(attacker.address, amount, nonce, sigs),
      ).to.be.revertedWith("signers must be distinct & sorted");
    });

    it("allows withdrawal with three distinct validators", async function () {
      const { bridge, validator1, validator2, validator3, attacker } =
        await deployBridge("SafeBridge");

      const amount = ethers.parseEther("5");
      const nonce = 2;

      const id = await createMessage(attacker.address, amount, nonce);

      const signatures = [
        {
          addr: validator1.address,
          sig: await validator1.signMessage(ethers.getBytes(id)),
        },
        {
          addr: validator2.address,
          sig: await validator2.signMessage(ethers.getBytes(id)),
        },
        {
          addr: validator3.address,
          sig: await validator3.signMessage(ethers.getBytes(id)),
        },
      ].sort((a, b) =>
        a.addr.toLowerCase().localeCompare(b.addr.toLowerCase()),
      );

      await bridge.withdraw(
        attacker.address,
        amount,
        nonce,
        signatures.map((x) => x.sig),
      );

      expect(
        await ethers.provider.getBalance(await bridge.getAddress()),
      ).to.equal(ethers.parseEther("5"));
    });

    it("prevents replay attacks", async function () {
      const { bridge, validator1, validator2, validator3, attacker } =
        await deployBridge("SafeBridge");

      const amount = ethers.parseEther("1");
      const nonce = 10;

      const id = await createMessage(attacker.address, amount, nonce);

      const signatures = [
        {
          addr: validator1.address,
          sig: await validator1.signMessage(ethers.getBytes(id)),
        },
        {
          addr: validator2.address,
          sig: await validator2.signMessage(ethers.getBytes(id)),
        },
        {
          addr: validator3.address,
          sig: await validator3.signMessage(ethers.getBytes(id)),
        },
      ].sort((a, b) =>
        a.addr.toLowerCase().localeCompare(b.addr.toLowerCase()),
      );

      const sigs = signatures.map((x) => x.sig);

      await bridge.withdraw(attacker.address, amount, nonce, sigs);

      await expect(
        bridge.withdraw(attacker.address, amount, nonce, sigs),
      ).to.be.revertedWith("already processed");
    });
  });
});
