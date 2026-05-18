module.exports = {
  solidity: '0.8.9',
  networks: {
    hardhat: {
      // Pin to Cancun: Prague (default in hardhat >=2.26) enforces EIP-7825's
      // per-transaction gas cap of 2^24, which rejects the test deployments.
      hardfork: 'cancun',
    },
  },
};
