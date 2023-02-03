import { fetchDeployContractTransactionFromEtherscan, fetchTransactionByHashFromRPC } from './abi';
describe('getDeployContractTransactionHash', () => {
  test('Returns the transaction hash', async () => {
    const transactionHash = await fetchDeployContractTransactionFromEtherscan(
      'mainnet',
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    );

    expect(transactionHash).toBe(
      '0xe7e0fe390354509cd08c9a0168536938600ddc552b3f7cb96030ebef62e75895',
    );
  });
});

describe('fetchTransactionByHash', () => {
  test('Returns the transaction', async () => {
    const txn = await fetchTransactionByHashFromRPC(
      'ethereum',
      '0xe7e0fe390354509cd08c9a0168536938600ddc552b3f7cb96030ebef62e75895',
    );
    expect(txn.result.hash).toStrictEqual(
      '0xe7e0fe390354509cd08c9a0168536938600ddc552b3f7cb96030ebef62e75895',
    );
  });
});
