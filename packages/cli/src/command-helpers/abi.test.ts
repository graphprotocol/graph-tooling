import {
  fetchDeployContractTransactionFromEtherscan,
  fetchTransactionByHashFromRPC,
  getStartBlockForContract,
} from './abi';

// CONTRACT address for test
const CONTRACT = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
// TXN_HASH for test
const TXN_HASH = '0xe7e0fe390354509cd08c9a0168536938600ddc552b3f7cb96030ebef62e75895';
// An object with some test cases for contract deployment block numbers
const TEST_CONTRACT_START_BLOCKS = {
  mainnet: {
    '0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd': 10736242,
  },

  matic: {
    '0x0769fd68dFb93167989C6f7254cd0D766Fb2841F': 13911377,
  },
  'arbitrum-one': {
    '0xF4d73326C13a4Fc5FD7A064217e12780e9Bd62c3': 226981,
  },
  optimism: {
    '0xc35DADB65012eC5796536bD9864eD8773aBc74C4': 7019815,
  },
  gnosis: {
    '0xdDCbf776dF3dE60163066A5ddDF2277cB445E0F3': 16655565,
  },

  fantom: {
    '0xf731202A3cf7EfA9368C2d7bD613926f7A144dB5': 28771200,
  },

  bsc: {
    '0xc35DADB65012eC5796536bD9864eD8773aBc74C4': 5205069,
  },
};

describe.skip('getDeployContractTransactionHash', () => {
  test('Returns the transaction hash', async () => {
    const transactionHash = await fetchDeployContractTransactionFromEtherscan('mainnet', CONTRACT);
    expect(transactionHash).toBe(TXN_HASH);
  });
});

describe.skip('fetchTransactionByHash', () => {
  test('Returns the transaction', async () => {
    const txn = await fetchTransactionByHashFromRPC('ethereum', TXN_HASH);
    expect(txn.result.hash).toStrictEqual(TXN_HASH);
  });
});

describe.skip('getStartBlockForContract', () => {
  for (const [network, contracts] of Object.entries(TEST_CONTRACT_START_BLOCKS)) {
    for (const [contract, startBlockExp] of Object.entries(contracts)) {
      test(`Returns the start block ${network} ${contract} ${startBlockExp}`, async () => {
        //loop through the contractStartBlocks object and test each network
        const startBlock = await getStartBlockForContract(network, contract);
        expect(startBlock).toBe(startBlockExp);
      });
    }
  }
});
