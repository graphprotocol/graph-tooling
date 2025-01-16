import { describe, expect, test } from 'vitest';
import EthereumABI from '../protocols/ethereum/abi.js';
import { ContractService } from './contracts.js';
import { loadRegistry } from './registry.js';

// An object with some test cases for contract deployment block numbers
const TEST_CONTRACT_START_BLOCKS = {
  'arbitrum-one': {
    '0xF4d73326C13a4Fc5FD7A064217e12780e9Bd62c3': 226_981,
  },
  avalanche: {
    '0xc35DADB65012eC5796536bD9864eD8773aBc74C4': 506_190,
  },
  bsc: {
    '0xc35DADB65012eC5796536bD9864eD8773aBc74C4': 5_205_069,
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
  optimism: {
    '0xc35DADB65012eC5796536bD9864eD8773aBc74C4': 7_019_815,
  },
  gnosis: {
    '0xdDCbf776dF3dE60163066A5ddDF2277cB445E0F3': 16_655_565,
  },
  // not stable RPCs
  // moonriver: {
  //   '0x3dB01570D97631f69bbb0ba39796865456Cf89A5': 800_950,
  // },
  // celo: {
  //   '0x8084936982D089130e001b470eDf58faCA445008': 10_186_627,
  // },

  // Skipping these networks for now because they do not support the latest etherscan contracts API or is blockScout based

  // Chains that doesn't support the latest etherscan contracts API
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

const TEST_SOURCIFY_CONTRACT_INFO = {
  mainnet: {
    '0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd': {
      name: 'MasterChef',
      startBlock: 10_736_242,
    },
  },
  optimism: {
    '0xc35DADB65012eC5796536bD9864eD8773aBc74C4': {
      name: 'BentoBoxV1',
      startBlock: 7_019_815,
    },
  },
  wax: {
    account: {
      name: null,
      startBlock: null,
    },
  },
  'non-existing chain': {
    '0x0000000000000000000000000000000000000000': {
      name: null,
      startBlock: null,
    },
  },
};

describe('getStartBlockForContract', { sequential: true }, async () => {
  const registry = await loadRegistry();
  const contractService = new ContractService(registry);
  for (const [network, contracts] of Object.entries(TEST_CONTRACT_START_BLOCKS)) {
    for (const [contract, startBlockExp] of Object.entries(contracts)) {
      test(
        `Returns the start block ${network} ${contract} ${startBlockExp}`,
        async () => {
          //loop through the TEST_CONTRACT_START_BLOCKS object and test each network
          const startBlock = await contractService.getStartBlock(network, contract);
          expect(parseInt(startBlock)).toBe(startBlockExp);
        },
        { timeout: 10_000 },
      );
    }
  }
});

describe('getFromSourcifyForContract', { sequential: true }, async () => {
  const registry = await loadRegistry();
  const contractService = new ContractService(registry);
  for (const [networkId, contractInfo] of Object.entries(TEST_SOURCIFY_CONTRACT_INFO)) {
    for (const [contract, t] of Object.entries(contractInfo)) {
      test(
        `Returns contract information ${networkId} ${contract} ${t.name} ${t.startBlock}`,
        async () => {
          const result = await contractService.getFromSourcify(EthereumABI, networkId, contract);
          if (t.name === null && t.startBlock === null) {
            expect(result).toBeNull();
          } else {
            // Only check name and startBlock, omit API property from Sourcify results
            const { name, startBlock } = result!;
            expect(t).toEqual({ name, startBlock: parseInt(startBlock) });
          }
        },
        { timeout: 10_000 },
      );
    }
  }
});
