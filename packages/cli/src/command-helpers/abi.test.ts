import {
  fetchDeployContractTransactionFromEtherscan,
  fetchTransactionByHashFromRPC,
  getStartBlockForContract,
} from './abi';

const CONTRACT = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const TXN_HASH = '0xe7e0fe390354509cd08c9a0168536938600ddc552b3f7cb96030ebef62e75895';
const START_BLOCK = 6082465;
describe('getDeployContractTransactionHash', () => {
  test('Returns the transaction hash', async () => {
    const transactionHash = await fetchDeployContractTransactionFromEtherscan('mainnet', CONTRACT);

    expect(transactionHash).toBe(TXN_HASH);
  });
});

describe('fetchTransactionByHash', () => {
  test('Returns the transaction', async () => {
    const txn = await fetchTransactionByHashFromRPC('ethereum', TXN_HASH);
    expect(txn.result.hash).toStrictEqual(TXN_HASH);
  });
});

describe('getStartBlockForContract', () => {
  test('Returns the start block', async () => {
    const startBlock = await getStartBlockForContract('mainnet', CONTRACT);
    console.log(startBlock);
    expect(startBlock).toBe(START_BLOCK);
  });
});
