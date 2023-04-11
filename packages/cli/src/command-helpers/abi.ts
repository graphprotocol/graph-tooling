import { fetch } from '@whatwg-node/fetch';
import immutable from 'immutable';
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
  throw new Error(`Failed to fetch contract creation transaction hash
  `);
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
    case 'base-testnet':
      return `https://api-goerli.basescan.org/api`;
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
    case 'optimism-goerli':
      return `https://api-goerli-optimistic.etherscan.io/api`;
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
    case 'celo':
      return `https://api.celoscan.io/api`;
    case 'celo-alfajores':
      return `https://alfajores.celoscan.io/api`;
    case 'gnosis':
      return `https://api.gnosisscan.io/api`;
    case 'fantom':
      return `https://api.ftmscan.com/api`;
    case 'fantom-testnet':
      return `https://api-testnet.ftmscan.com/api`;
    case 'zksync-era':
      return `https://explorer.zksync.io/api`;
    case 'polygon-zkevm-testnet':
      return `https://testnet-zkevm.polygonscan.com/api`;
    case 'polygon-zkevm':
      return `https://zkevm.polygonscan.com/api`;
    case 'sepolia':
      return `https://api-sepolia.etherscan.io/api`;
    default:
      return `https://api-${network}.etherscan.io/api`;
  }
};
const getPublicRPCEndpoint = (network: string) => {
  switch (network) {
    case 'arbitrum-goerli':
      return 'https://goerli-rollup.arbitrum.io/rpc';
    case 'arbitrum-one':
      return 'https://arb1.arbitrum.io/rpc';
    case 'aurora':
      return 'https://rpc.mainnet.aurora.dev';
    case 'aurora-testnet':
      return 'https://rpc.testnet.aurora.dev';
    case 'avalanche':
      return 'https://api.avax.network/ext/bc/C/rpc';
    case 'base-testnet':
      return 'https://goerli.base.org';
    case 'bsc':
      return 'https://bsc-dataseed.binance.org';
    case 'celo':
      return 'https://forno.celo.org';
    case 'celo-alfajores':
      return 'https://alfajores-forno.celo-testnet.org';
    case 'chapel':
      return 'https://rpc.chapel.dev';
    case 'clover':
      return 'https://rpc.clover.finance';
    case 'fantom':
      return 'https://rpcapi.fantom.network';
    case 'fantom-testnet':
      return 'https://rpc.testnet.fantom.network';
    case 'fuji':
      return 'https://api.avax-test.network/ext/bc/C/rpc';
    case 'fuse':
      return 'https://rpc.fuse.io';
    case 'goerli':
      return 'https://rpc.ankr.com/eth_goerli';
    case 'gnosis':
      return 'https://safe-transaction.gnosis.io';
    case 'mainnet':
      return 'https://rpc.ankr.com/eth';
    case 'matic':
      return 'https://rpc-mainnet.maticvigil.com';
    case 'mbase':
      return 'https://rpc.moonbase.moonbeam.network';
    case 'mumbai':
      return 'https://rpc-mumbai.maticvigil.com';
    case 'moonbeam':
      return 'https://rpc.api.moonbeam.network';
    case 'moonriver':
      return 'https://moonriver.public.blastapi.io';
    case 'optimism':
      return 'https://mainnet.optimism.io';
    case 'optimism-goerli':
      return 'https://goerli.optimism.io';
    case 'poa-core':
      return 'https://core.poa.network';
    case 'poa-sokol':
      return 'https://sokol.poa.network';
    case 'polygon-zkevm-testnet':
      return 'https://rpc.public.zkevm-test.net';
    case 'polygon-zkevm':
      return 'https://zkevm-rpc.com';
    case 'rinkeby':
      return 'https://rpc.ankr.com/eth_rinkeby';
    case 'zksync-era':
      return 'https://zksync2-mainnet.zksync.io';
    case 'sepolia':
      return 'https://rpc.ankr.com/eth_sepolia';
    default:
      throw new Error(`Unknown network: ${network}`);
  }
};
