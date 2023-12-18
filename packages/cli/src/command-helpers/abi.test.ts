import { describe, expect, test } from 'vitest';
import { getStartBlockForContract } from './abi';

// An object with some test cases for contract deployment block numbers
const TEST_CONTRACT_START_BLOCKS = {
  'arbitrum-goerli': {
    '0xde438d54c7b75f798985ae38a4d07b5431702077': 4_488_583,
  },
  'arbitrum-one': {
    '0xF4d73326C13a4Fc5FD7A064217e12780e9Bd62c3': 226_981,
  },
  avalanche: {
    '0xc35DADB65012eC5796536bD9864eD8773aBc74C4': 506_190,
  },
  bsc: {
    '0xc35DADB65012eC5796536bD9864eD8773aBc74C4': 5_205_069,
  },
  fantom: {
    '0xf731202A3cf7EfA9368C2d7bD613926f7A144dB5': 28_771_200,
  },
  goerli: {
    '0xff02b7d59975E76F67B63b20b813a9Ec0f6AbD60': 226_385,
  },
  mainnet: {
    '0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd': 10_736_242,
  },
  matic: {
    '0x0769fd68dFb93167989C6f7254cd0D766Fb2841F': 13_911_377,
  },
  moonbeam: {
    '0x011E52E4E40CF9498c79273329E8827b21E2e581': 505_060,
  },
  moonriver: {
    '0x3dB01570D97631f69bbb0ba39796865456Cf89A5': 800_950,
  },
  optimism: {
    '0xc35DADB65012eC5796536bD9864eD8773aBc74C4': 7_019_815,
  },

  // Skipping these networks for now because they do not support the latest etherscan contracts API or is blockScout based

  // Chains that doesnt support the latest etherscan contracts API
  //  mumbai: {
  //     '0x73bDCeC61b7b4707Baa4775c06A438A903065a17': 29_110_890,
  //   },
  // chapel: {
  //   '0x549fb5626025237351446ac502decdf2f3a4c570': 25_509_955,
  // },
  // 'fantom-testnet': {
  //   '0xa40f1c7cc67180aa941e9ef66ee32f704e9600a6': 13_679_941,
  // },
  // fuji: {
  //   '0x7a2b3f2ca3e0b5867d44ef8bc5ba316f98e05f05': 18_710_858,
  // },
  // gnosis: {
  //   '0xdDCbf776dF3dE60163066A5ddDF2277cB445E0F3': 16655565,
  // },

  // Networks with blockscout API
  // aurora:{
  //   '0x76FA7f90D3900eB95Cfc58AB12c916984AeC50c8': 77431034,
  // }
  // 'aurora-testnet': {
  //   '0x76FA7f90D3900eB95Cfc58AB12c916984AeC50c8': 77431034,
  // },
  // fuse: {
  //   '0x3dB01570D97631f69bbb0ba39796865456Cf89A5': 1000000,
  // },
  // 'poa-core': {
  //   '0x2bab54316c0585c66f3f091b2ae3ab3296ba0fc3': 7_405_006,
  // },
  // 'poa-sokol': {
  //   '0x2bab54316c0585c66f3f091b2ae3ab3296ba0fc3': 7_405_006,
  // },
  // celo: {
  //   '0x8084936982D089130e001b470eDf58faCA445008': 10186627,
  // },
  // 'celo-alfajores': {
  //   '0xc857ea98ab2dae9877c9fd23971152cd2776d0e4': 9_142_263,
  // },

  // 'optimism-kovan': {
  //   '0x2bab54316c0585c66f3f091b2ae3ab3296ba0fc3': 7_405_006,
  // },
  // clover: {
  // },
};

// skip this test since its time consuming
describe.skip('getStartBlockForContract', () => {
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
