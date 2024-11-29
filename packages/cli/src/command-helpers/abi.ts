import immutable from 'immutable';
import { GRAPH_CLI_SHARED_HEADERS } from '../constants';
import debugFactory from '../debug';
import fetch from '../fetch';
import ABI from '../protocols/ethereum/abi';
import { withSpinner } from './spinner';

const logger = debugFactory('graph-cli:abi-helpers');

const fetchFromEtherscan = async (url: string): Promise<any | null> => {
  const result = await fetch(url);
  let json: any = {};

  if (result.ok) {
    json = await result.json().catch(error => {
      throw new Error(`Failed to read JSON response from Etherscan: ${error}`);
    });

    // Etherscan returns a JSON object that has a `status`, a `message` and
    // a `result` field. The `status` is '0' in case of errors and '1' in
    // case of success
    if (json.status === '1') return json;
  }

  logger(
    'Failed to fetchFromEtherscan: [%s] %s (%s)\n%O',
    result.status,
    result.statusText,
    result.url,
    json,
  );
  return null;
};

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
      const json = await fetchFromEtherscan(
        `${scanApiUrl}?module=contract&action=getabi&address=${address}`,
      );

      if (json)
        return new ABICtor('Contract', undefined, immutable.fromJS(JSON.parse(json.result)));

      throw new Error('Try loading it from a local file');
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
  const json = await fetchFromEtherscan(
    `${scanApiUrl}?module=contract&action=getcontractcreation&contractaddresses=${address}`,
  );

  if (json) {
    const hash = json.result[0].txHash;
    logger('Successfully fetchDeployContractTransactionFromEtherscan. txHash: %s', hash);
    return hash;
  }

  throw new Error(`Failed to fetch deploy contract transaction`);
};

export const fetchTransactionByHashFromRPC = async (
  network: string,
  transactionHash: string,
): Promise<any> => {
  let json: any;
  const RPCURL = getPublicRPCEndpoint(network);
  try {
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
    throw new Error(
      `Failed to run \`eth_getTransactionByHash\` on RPC (${RPCURL}) (run with env \`DEBUG=*\` for full error).`,
    );
  }
};

export const fetchSourceCodeFromEtherscan = async (
  network: string,
  address: string,
): Promise<any> => {
  const scanApiUrl = getEtherscanLikeAPIUrl(network);
  const json = await fetchFromEtherscan(
    `${scanApiUrl}?module=contract&action=getsourcecode&address=${address}`,
  );

  // Have to check that the SourceCode response is not empty due to Etherscan API bug responding with
  // 1 - OK on non-valid contracts.
  if (json.result[0].SourceCode) return json;

  throw new Error(`Failed to fetch contract source code: ${json.result[0].ABI}`);
};

export const getContractNameForAddress = async (
  network: string,
  address: string,
): Promise<string> => {
  try {
    const contractSourceCode = await fetchSourceCodeFromEtherscan(network, address);
    let contractName: string = contractSourceCode.result[0].ContractName;

    // Some explorers will return the full path of the contract instead of just the name
    // Example: contracts/SyncSwapRouter.sol:SyncSwapRouter
    if (contractName.includes(':'))
      contractName = contractName.substring(contractName.lastIndexOf(':') + 1);

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
      return `https://mainnet.abi.pinax.network/api`;
    case 'arbitrum-one':
      return `https://arbitrum-one.abi.pinax.network/api`;
    case 'arbitrum-goerli':
      return `https://api-goerli.arbiscan.io/api`;
    case 'arbitrum-sepolia':
      return `https://arbitrum-sepolia.abi.pinax.network/api`;
    case 'bsc':
      return `https://bsc.abi.pinax.network/api`;
    case 'base-testnet':
      return `https://api-goerli.basescan.org/api`;
    case 'base-sepolia':
      return `https://base-sepolia.abi.pinax.network/api`;
    case 'base':
      return `https://base.abi.pinax.network/api`;
    case 'chapel':
      return `https://bsc-testnet.abi.pinax.network/api`;
    case 'matic':
      return `https://polygon.abi.pinax.network/api`;
    case 'mumbai':
      return `https://polygon-mumbai.abi.pinax.network/api`;
    case 'aurora':
      return `https://explorer.mainnet.aurora.dev/api`;
    case 'aurora-testnet':
      return `https://explorer.testnet.aurora.dev/api`;
    case 'optimism-goerli':
      return `https://api-goerli-optimistic.etherscan.io/api`;
    case 'optimism':
      return `https://optimism.abi.pinax.network/api`;
    case 'moonbeam':
      return `https://moonbeam.abi.pinax.network/api`;
    case 'moonriver':
      return `https://api-moonriver.moonscan.io/api`;
    case 'mbase':
      return `https://moonbase.abi.pinax.network/api`;
    case 'avalanche':
      return `https://api.snowtrace.io/api`;
    case 'fuji':
      return `https://api-testnet.snowtrace.io/api`;
    case 'celo':
      return `https://celo.abi.pinax.network/api`;
    case 'celo-alfajores':
      return `https://celo-alfajores.abi.pinax.network/api`;
    case 'gnosis':
      return `https://gnosis.abi.pinax.network/api`;
    case 'fantom':
      return `https://fantom.abi.pinax.network/api`;
    case 'fantom-testnet':
      return `https://fantom-testnet.abi.pinax.network/api`;
    case 'zksync-era':
      return `https://block-explorer-api.mainnet.zksync.io/api`;
    case 'zksync-era-testnet':
      return `https://block-explorer-api.testnets.zksync.dev/api`;
    case 'zksync-era-sepolia':
      return 'https://block-explorer-api.sepolia.zksync.dev/api';
    case 'polygon-zkevm-testnet':
      return `https://testnet-zkevm.polygonscan.com/api`;
    case 'polygon-zkevm':
      return `https://polygon-zkevm.abi.pinax.network/api`;
    case 'sepolia':
      return `https://sepolia.abi.pinax.network/api`;
    case 'scroll-sepolia':
      return `https://api-sepolia.scrollscan.dev/api`;
    case 'optimism-sepolia':
      return `https://optimism-sepolia.abi.pinax.network/api`;
    case 'scroll':
      return `https://api.scrollscan.com/api`;
    case 'linea':
      return `https://linea.abi.pinax.network/api`;
    case 'linea-sepolia':
      return 'https://linea-sepolia.abi.pinax.network/api';
    case 'linea-goerli':
      return `https://api.linea-goerli.build/api`;
    case 'blast-testnet':
      return `https://blast-testnet.abi.pinax.network/api`;
    case 'blast-mainnet':
      return `https://blast.abi.pinax.network/api`;
    case 'etherlink-testnet':
      return `https://testnet-explorer.etherlink.com/api`;
    case 'polygon-amoy':
      return `https://polygon-amoy.abi.pinax.network/api`;
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
      return `https://polygon-zkevm-cardona.abi.pinax.network/api`;
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
      return 'https://xexplorer.neo.org/api/ngd/api';
    case 'neox-testnet':
      return 'https://xt4scan.ngd.network/api/ngd/api';
    case 'arbitrum-nova':
      return 'https://arbitrum-nova.abi.pinax.network/api';
    case 'soneium-testnet':
      return 'https://soneium-minato.blockscout.com/api';
    case 'chiliz':
      return 'https://scan.chiliz.com/api';
    case 'chiliz-testnet':
      return 'https://spicy-explorer.chiliz.com/api';
    case 'boba':
      return 'https://api.routescan.io/v2/network/mainnet/evm/288/etherscan/api';
    case 'boba-testnet':
      return 'https://api.routescan.io/v2/network/testnet/evm/28882/etherscan/api';
    case 'boba-bnb':
      return 'https://api.routescan.io/v2/network/mainnet/evm/56288/etherscan/api';
    case 'boba-bnb-testnet':
      return 'https://api.routescan.io/v2/network/testnet/evm/9728/etherscan/api';
    case 'fuse-testnet':
      return 'https://explorer.fusespark.io/api';
    case 'rootstock-testnet':
      return 'https://rootstock-testnet.blockscout.com/api';
    case 'unichain-testnet':
      return 'https://unichain-sepolia.blockscout.com/api';
    case 'lens-testnet':
      return 'https://block-explorer-api.testnet.lens.dev/api';
    case 'abstract-testnet':
      return 'https://block-explorer-api.testnet.abs.xyz/api';
    case 'corn':
      return 'https://maizenet-explorer.usecorn.com/api';
    case 'corn-testnet':
      return 'https://testnet-explorer.usecorn.com/api';
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
      return 'https://rpc.gnosischain.com';
    case 'mainnet':
      return 'https://rpc.ankr.com/eth';
    case 'matic':
      return 'https://polygon-rpc.com/';
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
    case 'arbitrum-nova':
      return 'https://nova.arbitrum.io/rpc';
    case 'soneium-testnet':
      return 'https://rpc.minato.soneium.org/';
    case 'chiliz':
      return 'https://rpc.ankr.com/chiliz';
    case 'chiliz-testnet':
      return 'https://spicy-rpc.chiliz.com';
    case 'boba':
      return 'https://boba-eth.drpc.org';
    case 'boba-testnet':
      return 'https://sepolia.boba.network';
    case 'boba-bnb':
      return 'https://bnb.boba.network';
    case 'boba-bnb-testnet':
      return 'https://testnet.bnb.boba.network';
    case 'fuse-testnet':
      return 'https://rpc.fusespark.io';
    case 'rootstock-testnet':
      return 'https://public-node.testnet.rsk.co';
    case 'kaia':
      return 'https://public-en.node.kaia.io';
    case 'kaia-testnet':
      return 'https://public-en.kairos.node.kaia.io';
    case 'unichain-testnet':
      return 'https://sepolia.unichain.org';
    case 'lens-testnet':
      return 'https://api.staging.lens.zksync.dev';
    case 'abstract-testnet':
      return 'https://api.testnet.abs.xyz';
    case 'corn':
      return 'https://maizenet-rpc.usecorn.com';
    case 'corn-testnet':
      return 'https://testnet-rpc.usecorn.com';
    default:
      throw new Error(`Unknown network: ${network}`);
  }
};
