import immutable from 'immutable';
import fetch from 'node-fetch';
import ABI from '../protocols/ethereum/abi';
import { PUBLIC_RPC_ENDPOINTS } from './constants';
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
    `Fetching Start Block`,
    `Failed to fetch Start Block`,
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

  const json = await fetchContractCreationHashWithRetry(
    `${scanApiUrl}?module=contract&action=getcontractcreation&contractaddresses=${address}`,
    5,
  );
  if (json.status === '1') {
    return json.result[0].txHash;
  }

  throw new Error(`Failed to fetch deploy contract transaction`);
};

export const fetchContractCreationHashWithRetry = async (
  url: string,
  retryCount: number,
): Promise<any> => {
  let json: any;
  try {
    const result = await fetch(url);
    json = await result.json();
    if (json.status === '0') {
      return await fetchContractCreationHashWithRetry(url, retryCount - 1);
    }
    return json;
  } catch (error) {
    if (retryCount > 0) {
      return await fetchContractCreationHashWithRetry(url, retryCount - 1);
    }
    throw new Error('Failed to fetch contract creation hash from RPC');
  }
};

export const fetchTransactionByHashFromRPC = async (
  network: string,
  transactionHash: string,
): Promise<any> => {
  let json: any;
  try {
    const RPCURL = PUBLIC_RPC_ENDPOINTS[String(network)];
    if (!RPCURL) throw new Error(`Unable to fetch RPC URL for ${network}`);
    const result = await fetch(String(RPCURL), {
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
    json = await result.json();
    return json;
  } catch (error) {
    throw new Error('Failed to fetch contract creation hash from RPC');
  }
};

export const getStartBlockForContract = async (
  network: string,
  address: string,
): Promise<number> => {
  try {
    const transactionHash = await fetchDeployContractTransactionFromEtherscan(network, address);
    const txn = await fetchTransactionByHashFromRPC(network, transactionHash);
    return parseInt(txn.result.blockNumber, 16);
  } catch (error) {
    throw new Error(error);
  }
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
