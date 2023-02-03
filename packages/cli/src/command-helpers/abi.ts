import immutable from 'immutable';
import fetch from 'node-fetch';
import ABI from '../protocols/ethereum/abi';
import { withSpinner } from './spinner';

export const loadAbiFromEtherscan = async (
  ABICtor: typeof ABI,
  network: string,
  address: string,
): Promise<ABI> =>
  await withSpinner(
    `Fetching ABI from Etherscan`,
    `Failed to fetch ABI from Etherscan`,
    `Warnings while fetching ABI from Etherscan`,
    async () => {
      const scanApiUrl = getEtherscanLikeAPIUrl(network);
      const result = await fetch(`${scanApiUrl}?module=contract&action=getabi&address=${address}`);
      const json = await result.json();

      // Etherscan returns a JSON object that has a `status`, a `message` and
      // a `result` field. The `status` is '0' in case of errors and '1' in
      // case of success
      if (json.status === '1') {
        return new ABICtor('Contract', undefined, immutable.fromJS(JSON.parse(json.result)));
      }
      throw new Error('ABI not found, try loading it from a local file');
    },
  );

export const loadStartBlockForContract = async (
  network: string,
  address: string,
): Promise<string> =>
  await withSpinner(
    `Fetching deploy contract transaction from Etherscan`,
    `Failed to fetch deploy contract transaction from Etherscan`,
    `Warnings while fetching deploy contract transaction from Etherscan`,
    async () => {
      return getStartBlockForContract(network, address);
    },
  );

export const fetchDeployContractTransactionFromEtherscan = async (
  network: string,
  address: string,
): Promise<string> => {
  const scanApiUrl = getEtherscanLikeAPIUrl(network);

  const result = await fetch(
    `${scanApiUrl}?module=contract&action=getcontractcreation&contractaddresses=${address}`,
  );

  const json = await result.json();
  if (json.status === '1') {
    return json.result[0].txHash;
  }
  throw new Error('Unable to fetch deploy contract transaction from Etherscan');
};

export const fetchTransactionByHashFromRPC = async (
  network: string,
  transactionHash: string,
): Promise<any> => {
  const RPCURL = 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'; // TODO : use network specific RPC
  const result = await fetch(`${RPCURL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getTransactionByHash',
      params: [transactionHash],
      id: 1,
    }),
  });

  const json = await result.json();
  return json;
};

export const getStartBlockForContract = async (
  network: string,
  address: string,
): Promise<number> => {
  const transactionHash = await fetchDeployContractTransactionFromEtherscan(network, address);
  const txn = await fetchTransactionByHashFromRPC(network, transactionHash);
  return parseInt(txn.result.blockNumber, 16);
};

export const loadAbiFromBlockScout = async (
  ABICtor: typeof ABI,
  network: string,
  address: string,
) =>
  await withSpinner(
    `Fetching ABI from BlockScout`,
    `Failed to fetch ABI from BlockScout`,
    `Warnings while fetching ABI from BlockScout`,
    async () => {
      const result = await fetch(
        `https://blockscout.com/${network.replace(
          '-',
          '/',
        )}/api?module=contract&action=getabi&address=${address}`,
      );
      const json = await result.json();

      // BlockScout returns a JSON object that has a `status`, a `message` and
      // a `result` field. The `status` is '0' in case of errors and '1' in
      // case of success
      if (json.status === '1') {
        return new ABICtor('Contract', undefined, immutable.fromJS(JSON.parse(json.result)));
      }
      throw new Error('ABI not found, try loading it from a local file');
    },
  );

const getEtherscanLikeAPIUrl = (network: string) => {
  switch (network) {
    case 'mainnet':
      return `https://api.etherscan.io/api`;
    case 'arbitrum-one':
      return `https://api.arbiscan.io/api`;
    case 'arbitrum-goerli':
      return `https://api-goerli.arbiscan.io/api`;
    case 'bsc':
      return `https://api.bscscan.com/api`;
    case 'chapel':
      return `https://api-testnet.bscscan.com/api`;
    case 'matic':
      return `https://api.polygonscan.com/api`;
    case 'mumbai':
      return `https://api-testnet.polygonscan.com/api`;
    case 'aurora':
      return `https://api.aurorascan.dev/api`;
    case 'aurora-testnet':
      return `https://api-testnet.aurorascan.dev/api`;
    case 'optimism-kovan':
      return `https://api-kovan-optimistic.etherscan.io/api`;
    case 'optimism':
      return `https://api-optimistic.etherscan.io/api`;
    case 'moonbeam':
      return `https://api-moonbeam.moonscan.io/api`;
    case 'moonriver':
      return `https://api-moonriver.moonscan.io/api`;
    case 'mbase':
      return `https://api-moonbase.moonscan.io/api`;
    case 'avalanche':
      return `https://api.snowtrace.io/api`;
    case 'fuji':
      return `https://api-testnet.snowtrace.io/api`;
    case 'gnosis':
      return `https://api.gnosisscan.io/api`;
    case 'fantom':
      return `https://api.ftmscan.com/api`;
    case 'fantom-testnet':
      return `https://api-testnet.ftmscan.com/api`;
    default:
      return `https://api-${network}.etherscan.io/api`;
  }
};
