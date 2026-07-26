const { expect } = require("chai");
const { ethers } = require("hardhat");

// Lab 1 - Reentrancy (The DAO, 2016)
describe("Lab 1 | Reentrancy - The DAO", function () {
  async function fundedDAO(name) {
    const [tusharBhai, sakshi, om, chorAccount] = await ethers.getSigners();
    const DAO = await ethers.getContractFactory(name);
    const dao = await DAO.deploy();
    await dao.waitForDeployment();
    // Two honest users each deposit 5 ETH -> pool holds 10 ETH.
    await dao.connect(sakshi).deposit({ value: ethers.parseEther("5") });
    await dao.connect(om).deposit({ value: ethers.parseEther("5") });
    return { dao, chorAccount };
  }

  it("VULNERABLE: attacker drains the entire pool", async function () {
    const { dao, chorAccount } = await fundedDAO("VulnerableDAO");
    const daoAddr = await dao.getAddress();
    expect(await ethers.provider.getBalance(daoAddr)).to.equal(ethers.parseEther("10"));

    const Attacker = await ethers.getContractFactory("Attacker");
    const attacker = await Attacker.connect(chorAccount).deploy(daoAddr);
    await attacker.waitForDeployment();

    // Attacker seeds just 1 ETH, then re-enters to sweep everything.
    await attacker.connect(chorAccount).attack({ value: ethers.parseEther("1") });

    const poolAfter = await ethers.provider.getBalance(daoAddr);
    const loot = await attacker.loot();
    console.log(`      pool left: ${ethers.formatEther(poolAfter)} ETH | attacker loot: ${ethers.formatEther(loot)} ETH`);

    expect(poolAfter).to.be.lt(ethers.parseEther("1")); // pool emptied
    expect(loot).to.be.gte(ethers.parseEther("10"));     // ~11 ETH stolen
  });

  it("SAFE: the identical attack fails and the pool is untouched", async function () {
    const { dao, chorAccount } = await fundedDAO("SafeDAO");
    const daoAddr = await dao.getAddress();

    const Attacker = await ethers.getContractFactory("Attacker");
    const attacker = await Attacker.connect(chorAccount).deploy(daoAddr);
    await attacker.waitForDeployment();

    await expect(
      attacker.connect(chorAccount).attack({ value: ethers.parseEther("1") })
    ).to.be.reverted; // guard + CEI block the re-entry

    expect(await ethers.provider.getBalance(daoAddr)).to.equal(ethers.parseEther("10"));
  });
});
