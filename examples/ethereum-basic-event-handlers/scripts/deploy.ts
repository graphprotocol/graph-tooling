import { ethers } from 'hardhat';

async function main() {
  const Gravity = await ethers.getContractFactory('GravatarRegistry');
  const gravity = await Gravity.deploy();

  await gravity.deployed();

  console.log(`Gravity.sol deployed to ${gravity.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
