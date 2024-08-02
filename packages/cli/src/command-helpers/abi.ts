import immutable from 'immutable';
import { GRAPH_CLI_SHARED_HEADERS } from '../constants';
import debugFactory from '../debug';
import fetch from '../fetch';
import ABI from '../protocols/ethereum/abi';
import { withSpinner } from './spinner';

const logger = debugFactory('graph-cli:abi-helpers');

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

export const loadContractNameForAddress = async (
  network: string,
  address: string,
): Promise<string> =>
  await withSpinner(
    `Fetching Contract Name`,
    `Failed to fetch Contract Name`,
    `Warnings while fetching contract name from Etherscan`,
    async () => {
      return getContractNameForAddress(network, address);
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
    const hash = json.result[0].txHash;
    logger('Successfully fetchDeployContractTransactionFromEtherscan. txHash: %s', hash);
    return hash;
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
      logger('Failed to fetchContractCreationHashWithRetry: %O', error);
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
        ...GRAPH_CLI_SHARED_HEADERS,
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
    logger('Failed to fetchTransactionByHashFromRPC: %O', error);
    throw new Error('Failed to fetch contract creation transaction');
  }
};

export const fetchSourceCodeFromEtherscan = async (
  network: string,
  address: string,
): Promise<any> => {
  const scanApiUrl = getEtherscanLikeAPIUrl(network);
  const result = await fetch(
    `${scanApiUrl}?module=contract&action=getsourcecode&address=${address}`,
  );
  const json = await result.json();
  if (json.status === '1') {
    return json;
  }
  throw new Error('Failed to fetch contract source code');
};

export const getContractNameForAddress = async (
  network: string,
  address: string,
): Promise<string> => {
  try {
    const contractSourceCode = await fetchSourceCodeFromEtherscan(network, address);
    const contractName = contractSourceCode.result[0].ContractName;
    logger('Successfully getContractNameForAddress. contractName: %s', contractName);
    return contractName;
  } catch (error) {
    logger('Failed to fetch getContractNameForAddress: %O', error);
    throw new Error(error?.message);
  }
};

export const getStartBlockForContract = async (
  network: string,
  address: string,
): Promise<number> => {
  try {
    const transactionHash = await fetchDeployContractTransactionFromEtherscan(network, address);
    const txn = await fetchTransactionByHashFromRPC(network, transactionHash);
    const blockNumber = parseInt(txn.result.blockNumber, 16);
    logger('Successfully getStartBlockForContract. blockNumber: %s', blockNumber);
    return blockNumber;
  } catch (error) {
    logger('Failed to fetch getStartBlockForContract: %O', error);
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
        logger('Successfully loadAbiFromBlockScout. address: %s', address);
        return new ABICtor('Contract', undefined, immutable.fromJS(JSON.parse(json.result)));
      }
      logger('Failed to loadAbiFromBlockScout. address: %s', address);
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
    case 'arbitrum-sepolia':
      return `https://api-sepolia.arbiscan.io/api`;
    case 'bsc':
      return `https://api.bscscan.com/api`;
    case 'base-testnet':
      return `https://api-goerli.basescan.org/api`;
    case 'base-sepolia':
      return `https://api-sepolia.basescan.org/api`;
    case 'base':
      return `https://api.basescan.org/api`;
    case 'chapel':
      return `https://api-testnet.bscscan.com/api`;
    case 'matic':
      return `https://api.polygonscan.com/api`;
    case 'mumbai':
      return `https://api-testnet.polygonscan.com/api`;
    case 'aurora':
      return `https://explorer.mainnet.aurora.dev/api`;
    case 'aurora-testnet':
      return `https://explorer.testnet.aurora.dev/api`;
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
      return `https://api-alfajores.celoscan.io/api`;
    case 'gnosis':
      return `https://api.gnosisscan.io/api`;
    case 'fantom':
      return `https://api.ftmscan.com/api`;
    case 'fantom-testnet':
      return `https://api-testnet.ftmscan.com/api`;
    case 'zksync-era':
      return `https://block-explorer-api.mainnet.zksync.io/api`;
    case 'zksync-era-testnet':
      return `https://block-explorer-api.testnets.zksync.dev/api`;
    case 'zksync-era-sepolia':
      return 'https://block-explorer-api.sepolia.zksync.dev/api';
    case 'polygon-zkevm-testnet':
      return `https://testnet-zkevm.polygonscan.com/api`;
    case 'polygon-zkevm':
      return `https://api-zkevm.polygonscan.com/api`;
    case 'sepolia':
      return `https://api-sepolia.etherscan.io/api`;
    case 'scroll-sepolia':
      return `https://api-sepolia.scrollscan.dev/api`;
    case 'optimism-sepolia':
      return `https://api-sepolia-optimistic.etherscan.io/api`;
    case 'scroll':
      return `https://api.scrollscan.com/api`;
    case 'linea':
      return `https://api.lineascan.build/api`;
    case 'linea-sepolia':
      return 'https://api-sepolia.lineascan.build/api';
    case 'linea-goerli':
      return `https://api.linea-goerli.build/api`;
    case 'blast-testnet':
      return `https://api-sepolia.blastscan.io/api`;
    case 'blast-mainnet':
      return `https://api.blastscan.io/api`;
    case 'etherlink-testnet':
      return `https://testnet-explorer.etherlink.com/api`;
    case 'polygon-amoy':
      return `https://api-amoy.polygonscan.com/api`;
    case 'gnosis-chiado':
      return `https://gnosis-chiado.blockscout.com/api`;
    case 'mode-mainnet':
      return `https://explorer.mode.network/api`;
    case 'mode-sepolia':
      return `https://sepolia.explorer.mode.network/api`;
    case 'fuse':
      return 'https://explorer.fuse.io/api';
    case 'astar-zkevm-mainnet':
      return `https://astar-zkevm.explorer.startale.com/api`;
    case 'polygon-zkevm-cardona':
      return `https://api-cardona-zkevm.polygonscan.com/api`;
    case 'sei-mainnet':
      return `https://seitrace.com/pacific-1/api`;
    case 'sei-atlantic':
      return `https://seitrace.com/atlantic-2/api`;
    case 'rootstock':
      return 'https://rootstock.blockscout.com/api';
    case 'iotex':
      return 'https://index.iotexscan.io/api';
    case 'gravity-mainnet':
      return 'https://explorer.gravity.xyz/api';
    case 'gravity-testnet':
      return 'https://explorer-sepolia.gravity.xyz/api';
    case 'etherlink-mainnet':
      return 'https://explorer.etherlink.com/api';
    case 'iotex-testnet':
      return 'https://testnet.index.iotexscan.io/api';
    case 'neox':
      return 'https://xexplorer.neo.org/api';
    case 'neox-testnet':
      return 'https://xt4scan.ngd.network/api';

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
    case 'arbitrum-sepolia':
      return `https://sepolia-rollup.arbitrum.io/rpc`;
    case 'aurora':
      return 'https://rpc.mainnet.aurora.dev';
    case 'aurora-testnet':
      return 'https://rpc.testnet.aurora.dev';
    case 'avalanche':
      return 'https://api.avax.network/ext/bc/C/rpc';
    case 'base-testnet':
      return 'https://goerli.base.org';
    case 'base-sepolia':
      return 'https://sepolia.base.org';
    case 'base':
      return 'https://mainnet.base.org';
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
      return 'https://mainnet.era.zksync.io';
    case 'zksync-era-testnet':
      return 'https://testnet.era.zksync.dev';
    case 'zksync-era-sepolia':
      return 'https://sepolia.era.zksync.dev';
    case 'sepolia':
      return 'https://rpc.ankr.com/eth_sepolia';
    case 'scroll-sepolia':
      return 'https://rpc.ankr.com/scroll_sepolia_testnet';
    case 'scroll':
      return 'https://rpc.ankr.com/scroll';
    case 'linea':
      return 'https://linea-mainnet.public.blastapi.io';
    case 'linea-sepolia':
      return 'https://linea-sepolia.public.blastapi.io';
    case 'linea-goerli':
      return 'https://linea-goerli.public.blastapi.io';
    case 'blast-testnet':
      return 'https://sepolia.blast.io';
    case 'blast-mainnet':
      return 'https://rpc.blast.io';
    case 'optimism-sepolia':
      return 'https://sepolia.optimism.io';
    case 'etherlink-testnet':
      return `https://node.ghostnet.etherlink.com`;
    case 'polygon-amoy':
      return `https://rpc-amoy.polygon.technology`;
    case 'gnosis-chiado':
      return `https://rpc.chiadochain.net`;
    case 'mode-mainnet':
      return `https://mainnet.mode.network`;
    case 'mode-sepolia':
      return `https://sepolia.mode.network`;
    case 'astar-zkevm-mainnet':
      return `https://1rpc.io/astr`;
    case 'polygon-zkevm-cardona':
      return `https://rpc.cardona.zkevm-rpc.com`;
    case 'sei-mainnet':
      return `https://evm-rpc.sei-apis.com`;
    case 'sei-atlantic':
      return `https://evm-rpc-testnet.sei-apis.com`;
    case 'rootstock':
      return 'https://public-node.rsk.co';
    case 'iotex':
      return 'https://iotexrpc.com';
    case 'gravity-mainnet':
      return 'https://rpc.gravity.xyz/';
    case 'gravity-testnet':
      return 'https://rpc-sepolia.gravity.xyz';
    case 'etherlink-mainnet':
      return 'https://node.mainnet.etherlink.com';
    case 'iotex-testnet':
      return 'https://babel-api.testnet.iotex.io';
    case 'neox':
      return 'https://mainnet-1.rpc.banelabs.org';
    case 'neox-testnet':
      return 'https://neoxt4seed1.ngd.network';
    default:
      throw new Error(`Unknown network: ${network}`);
  }
};
