import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const config: HardhatUserConfig = {
  solidity: '0.4.25',
  defaultNetwork: 'test',
  networks: {
    localhost: {
      // Estimate gas per transaction instead of using the block gas limit.
      gas: 'auto',
    },
    test: {
      url: 'http://localhost:8545',
    },
  },
};

export default config;
