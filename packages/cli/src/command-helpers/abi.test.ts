import { getStartBlockForContract } from './abi';

// An object with some test cases for contract deployment block numbers
const TEST_CONTRACT_START_BLOCKS = {
  mainnet: {
    '0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd': 10_736_242,
  },
  matic: {
    '0x0769fd68dFb93167989C6f7254cd0D766Fb2841F': 13_911_377,
  },
  'arbitrum-one': {
    '0xF4d73326C13a4Fc5FD7A064217e12780e9Bd62c3': 226_981,
  },
  optimism: {
    '0xc35DADB65012eC5796536bD9864eD8773aBc74C4': 7_019_815,
  },
  fantom: {
    '0xf731202A3cf7EfA9368C2d7bD613926f7A144dB5': 28_771_200,
  },
  avalanche: {
    '0xc35DADB65012eC5796536bD9864eD8773aBc74C4': 506_190,
  },
  moonriver: {
    '0x3dB01570D97631f69bbb0ba39796865456Cf89A5': 800_950,
  },
  moonbeam: {
    '0x011E52E4E40CF9498c79273329E8827b21E2e581': 505_060,
  },
  bsc: {
    '0xc35DADB65012eC5796536bD9864eD8773aBc74C4': 5_205_069,
  },

  // Skip tests for these networks because they do not support the etherscan contracts API
  // fuse: {
  //   '0x3dB01570D97631f69bbb0ba39796865456Cf89A5': 1000000,
  // },
  // aurora:{
  //   '0x76FA7f90D3900eB95Cfc58AB12c916984AeC50c8': 77431034,
  // }
  // celo: {
  //   '0x8084936982D089130e001b470eDf58faCA445008': 10186627,
  // },
  // gnosis: {
  //   '0xdDCbf776dF3dE60163066A5ddDF2277cB445E0F3': 16655565,
  // },
};

describe('getStartBlockForContract', () => {
  for (const [network, contracts] of Object.entries(TEST_CONTRACT_START_BLOCKS)) {
    for (const [contract, startBlockExp] of Object.entries(contracts)) {
      test(`Returns the start block ${network} ${contract} ${startBlockExp}`, async () => {
        //loop through the TEST_CONTRACT_START_BLOCKS object and test each network
        const startBlock = await getStartBlockForContract(network, contract);
        expect(startBlock).toBe(startBlockExp);
      });
    }
  }
});
