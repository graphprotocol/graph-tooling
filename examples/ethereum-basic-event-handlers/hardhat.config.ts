import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const config: HardhatUserConfig = {
  solidity: '0.4.25',
  defaultNetwork: 'test',
  networks: {
    test: {
      url: 'http://localhost:8545',
    },
  },
};

export default config;
