const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lab 3 | Signature Verification - Wormhole", function () {
  // -------------------------------------------------------
  // Deploy all required contracts
  // -------------------------------------------------------
  async function deploySystem() {
    const [owner, alice, attacker] = await ethers.getSigners();

    // Real verifier
    const RealVerifier = await ethers.getContractFactory("RealVerifier");
    const realVerifier = await RealVerifier.deploy(owner.address);
    await realVerifier.waitForDeployment();

    // Fake verifier
    const FakeVerifier = await ethers.getContractFactory("FakeVerifier");
    const fakeVerifier = await FakeVerifier.deploy();
    await fakeVerifier.waitForDeployment();

    // Vulnerable bridge
    const VulnerableBridge = await ethers.getContractFactory(
      "VulnerableTokenBridge",
    );

    const vulnerableBridge = await VulnerableBridge.deploy();

    await vulnerableBridge.waitForDeployment();

    // Safe bridge
    const SafeBridge = await ethers.getContractFactory("SafeTokenBridge");

    const safeBridge = await SafeBridge.deploy(await realVerifier.getAddress());

    await safeBridge.waitForDeployment();

    return {
      owner,
      alice,
      attacker,
      realVerifier,
      fakeVerifier,
      vulnerableBridge,
      safeBridge,
    };
  }

  // -------------------------------------------------------
  // Create signed VAA
  // -------------------------------------------------------

  async function createValidSignature(owner) {
    const vaaHash = ethers.keccak256(ethers.toUtf8Bytes("Bridge Message"));

    const signature = await owner.signMessage(ethers.getBytes(vaaHash));

    return { vaaHash, signature };
  }

  // =======================================================
  // Deployment Tests
  // =======================================================

  describe("Deployment", function () {
    it("sets token name correctly", async function () {
      const { safeBridge } = await deploySystem();

      expect(await safeBridge.name()).to.equal("Wrapped ETH");
    });

    it("sets token symbol correctly", async function () {
      const { safeBridge } = await deploySystem();

      expect(await safeBridge.symbol()).to.equal("wETH");
    });
  });

  // =======================================================
  // Verifier Tests
  // =======================================================

  describe("Verifier", function () {
    it("RealVerifier accepts valid signature", async function () {
      const { owner, realVerifier } = await deploySystem();

      const { vaaHash, signature } = await createValidSignature(owner);

      expect(await realVerifier.verify(vaaHash, signature)).to.equal(true);
    });

    it("FakeVerifier always returns true", async function () {
      const { fakeVerifier } = await deploySystem();

      expect(await fakeVerifier.verify(ethers.ZeroHash, "0x")).to.equal(true);
    });
  });

  // =======================================================
  // Vulnerable Contract
  // =======================================================

  describe("VULNERABLE Bridge", function () {
    it("attacker mints tokens using FakeVerifier", async function () {
      const { attacker, fakeVerifier, vulnerableBridge } = await deploySystem();

      await vulnerableBridge.connect(attacker).mint(
        attacker.address,
        ethers.parseEther("100"),

        await fakeVerifier.getAddress(),

        ethers.ZeroHash,

        "0x",
      );

      expect(await vulnerableBridge.balanceOf(attacker.address)).to.equal(
        ethers.parseEther("100"),
      );
    });
  });

  // =======================================================
  // Safe Contract
  // =======================================================

  describe("SAFE Bridge", function () {
    it("rejects fake signature", async function () {
      const { attacker, safeBridge } = await deploySystem();
      await expect(
        safeBridge
          .connect(attacker)
          .mint(
            attacker.address,
            ethers.parseEther("100"),
            ethers.ZeroHash,
            "0x",
          ),
      ).to.be.reverted;
    });

    it("allows mint using valid guardian signature", async function () {
      const { owner, alice, safeBridge } = await deploySystem();

      const { vaaHash, signature } = await createValidSignature(owner);

      await safeBridge.mint(
        alice.address,

        ethers.parseEther("50"),

        vaaHash,

        signature,
      );

      expect(await safeBridge.balanceOf(alice.address)).to.equal(
        ethers.parseEther("50"),
      );
    });

    it("updates total supply after mint", async function () {
      const { owner, alice, safeBridge } = await deploySystem();

      const { vaaHash, signature } = await createValidSignature(owner);

      await safeBridge.mint(
        alice.address,

        ethers.parseEther("10"),

        vaaHash,

        signature,
      );

      expect(await safeBridge.totalSupply()).to.equal(ethers.parseEther("10"));
    });
  });
});
