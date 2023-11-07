import immutable from 'immutable';
import { fetch } from '@whatwg-node/fetch';
import ABI from '../protocols/ethereum/abi';
import { networks } from './chains';
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
  let json;
  for (let i = 0; i < retryCount; i++) {
    try {
      const result = await fetch(url);
      json = await result.json();
      if (json.status !== '0') {
        return json;
      }
    } catch (error) {
      /* empty */
    }
  }
  throw new Error(`Failed to fetch contract creation transaction hash`);
};

export const fetchTransactionByHashFromRPC = async (
  network: string,
  transactionHash: string,
): Promise<any> => {
  let json: any;
  try {
    const RPCURL = getPublicRPCEndpoint(network);
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
    throw new Error('Failed to fetch contract creation transaction');
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
    throw new Error(error?.message);
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

export const sleepForChain = async (network: string) => {
  const rateLimit = getEtherscanLikeAPIRateLimit(network);
  if (rateLimit === 0) return;
  await withSpinner(
    `Sleeping for ${rateLimit / 1000}s`,
    `Failed to sleep`,
    `Warnings while sleep`,
    async () => {
      await new Promise(resolve => setTimeout(resolve, rateLimit));
    },
  );
};

const getEtherscanLikeAPIUrl = (network: string) => {
  if (networks[network]?.etherscanUrl) {
    return networks[network].etherscanUrl;
  }
  throw new Error(`Unknown network: ${network}`);
};

const getPublicRPCEndpoint = (network: string) => {
  if (networks[network]?.publicRpcEndpoint) {
    return networks[network].publicRpcEndpoint;
  }
  throw new Error(`Unknown network: ${network}`);
};

const getEtherscanLikeAPIRateLimit = (network: string) => {
  return networks[network]?.rateLimit ?? 0;
};
