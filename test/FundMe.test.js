const { assert, expect } = require("chai");
const { ethers } = require("hardhat");
const { deployments, getNamedAccounts } = require("hardhat");

describe("FundMe", function () {
  let fundMe;
  let deployer;
  let mockAggregator;
  let sendValue = ethers.utils.parseEther("1"); // 1 ETH
  beforeEach(async function () {
    deployer = (await getNamedAccounts()).deployer;
    await deployments.fixture(["all"]);
    fundMe = await ethers.getContract("FundMe", deployer);
    mockAggregator = await ethers.getContract("MockV3Aggregator", deployer);
  });

  // Test for constructor
  describe("constructor", async function () {
    it("sets the aggregator addresses correctly", async () => {
      const response = await fundMe.getPriceFeed();
      assert.equal(response, mockAggregator.address);
    });
  });

  // Test for fund
  describe("fund", async () => {
    it("Fails if you don't send enough ETH", async () => {
      await expect(fundMe.fund()).to.be.revertedWith(
        "You need to spend more ETH!"
      );
    });

    it("Updated the amount funded data structure", async () => {
      await fundMe.fund({ value: sendValue });
      const response = fundMe.addressToAmountFunded[deployer];
    });
    assert.equal(response.toString(), sendValue.toString());

    it("Added funder to the funders", async () => {
      await fundMe.fund({ value: sendValue });
      const response = await fundMe.funders(0);
      assert.equal(response.toString(), deployer.toString());
    });
  });

  // Test for Withdraw
  // Arrange - Act - Assert
  describe("withdraw", async () => {
    beforeEach(async () => {
      await fundMe.fund({ value: sendValue });
    });
    it("withdraw ETH from a single funder", async () => {
      // Arrange
      const startingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      );
      const startingDeployerBalance = await fundMe.provider.getBalance(
        deployer
      );

      // Act
      const transactionResponse = await fundMe.withdraw();
      const transactionReceipt = await transactionResponse.wait(1);
      const { gasUsed, effectiveGasPrice } = transactionReceipt;
      const gasCost = gasUsed.mul(effectiveGasPrice);
      const endingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      );
      const endingDeployerBalance = await fundMe.provider.getBalance(deployer);

      // Assert
      assert.equal(endingFundMeBalance, 0);
      assert.equal(
        startingFundMeBalance.add(startingDeployerBalance).toString(),
        endingDeployerBalance.add(gasCost).toString()
      );
    });

    it("allows us to withdraw with multiple funders", async function () {
      const accounts = await ethers.getSigners();
      for (i = 1; i < 6; i++) {
        const fundMeConnectedContract = await fundMe.connect(accounts[i]);
        await fundMeConnectedContract.fund({ value: sendValue });
      }
      const startingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      );
      const startingDeployerBalance = await fundMe.provider.getBalance(
        deployer
      );

      // Act
      const transactionResponse = await fundMe.withdraw();
      // Let's comapre gas costs :)
      // const transactionResponse = await fundMe.withdraw()
      const transactionReceipt = await transactionResponse.wait();
      const { gasUsed, effectiveGasPrice } = transactionReceipt;
      const withdrawGasCost = gasUsed.mul(effectiveGasPrice);
      console.log(`GasCost: ${withdrawGasCost}`);
      console.log(`GasUsed: ${gasUsed}`);
      console.log(`GasPrice: ${effectiveGasPrice}`);
      const endingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      );
      const endingDeployerBalance = await fundMe.provider.getBalance(deployer);
      // Assert
      assert.equal(
        startingFundMeBalance.add(startingDeployerBalance).toString(),
        endingDeployerBalance.add(withdrawGasCost).toString()
      );
      // Make a getter for storage variables
      await expect(fundMe.funders(0)).to.be.reverted;

      // for (i = 1; i < 6; i++) {
      //   assert.equal(await fundMe.adressToAmountFunded(accounts[i].address), 0);
      // }
    });
    it("Only allows the owner to withdraw", async function () {
      const accounts = await ethers.getSigners();
      const attacker = accounts[5];
      const attackerContract = await fundMe.connect(attacker);
      await expect(attackerContract.withdraw()).to.be.revertedWith(
        "FundMe__NotOwner"
      );
    });
  });
});
