interface NetworkInfo {
  etherscanUrl: string;
  publicRpcEndpoint: string;
  rateLimit?: number;
}

export const networks: Record<string, NetworkInfo> = {
  mainnet: {
    etherscanUrl: 'https://api.etherscan.io/api',
    publicRpcEndpoint: 'https://rpc.ankr.com/eth',
    rateLimit: 5000,
  },
  arbitrumOne: {
    etherscanUrl: 'https://api.arbiscan.io/api',
    publicRpcEndpoint: 'https://arb1.arbitrum.io/rpc',
    rateLimit: 5000,
  },
  arbitrumGoerli: {
    etherscanUrl: 'https://api-goerli.arbiscan.io/api',
    publicRpcEndpoint: 'https://goerli-rollup.arbitrum.io/rpc',
  },
  bsc: {
    etherscanUrl: 'https://api.bscscan.com/api',
    publicRpcEndpoint: 'https://bsc-dataseed.binance.org',
    rateLimit: 5000,
  },
  baseTestnet: {
    etherscanUrl: 'https://api-goerli.basescan.org/api',
    publicRpcEndpoint: 'https://goerli.base.org',
  },
  base: {
    etherscanUrl: 'https://api.basescan.org/api',
    publicRpcEndpoint: 'https://rpc.base.org',
  },
  chapel: {
    etherscanUrl: 'https://api-testnet.bscscan.com/api',
    publicRpcEndpoint: 'https://rpc.chapel.dev',
  },
  matic: {
    etherscanUrl: 'https://api.polygonscan.com/api',
    publicRpcEndpoint: 'https://rpc-mainnet.maticvigil.com',
    rateLimit: 5000,
  },
  mumbai: {
    etherscanUrl: 'https://api-testnet.polygonscan.com/api',
    publicRpcEndpoint: 'https://rpc-mumbai.maticvigil.com',
  },
  aurora: {
    etherscanUrl: 'https://explorer.mainnet.aurora.dev/api',
    publicRpcEndpoint: 'https://rpc.mainnet.aurora.dev',
  },
  auroraTestnet: {
    etherscanUrl: 'https://explorer.old.testnet.aurora.dev/api',
    publicRpcEndpoint: 'https://rpc.testnet.aurora.dev',
  },
  optimismGoerli: {
    etherscanUrl: 'https://api-goerli-optimistic.etherscan.io/api',
    publicRpcEndpoint: 'https://goerli.optimism.io',
  },
  optimism: {
    etherscanUrl: 'https://api-optimistic.etherscan.io/api',
    publicRpcEndpoint: 'https://mainnet.optimism.io',
    rateLimit: 5000,
  },
  moonbeam: {
    etherscanUrl: 'https://api-moonbeam.moonscan.io/api',
    publicRpcEndpoint: 'https://rpc.api.moonbeam.network',
    rateLimit: 5000,
  },
  moonriver: {
    etherscanUrl: 'https://api-moonriver.moonscan.io/api',
    publicRpcEndpoint: 'https://moonriver.public.blastapi.io',
    rateLimit: 5000,
  },
  mbase: {
    etherscanUrl: 'https://api-moonbase.moonscan.io/api',
    publicRpcEndpoint: 'https://rpc.moonbase.moonbeam.network',
    rateLimit: 5000,
  },
  avalanche: {
    etherscanUrl: 'https://api.snowtrace.io/api',
    publicRpcEndpoint: 'https://api.avax.network/ext/bc/C/rpc',
    rateLimit: 5000,
  },
  fuji: {
    etherscanUrl: 'https://api-testnet.snowtrace.io/api',
    publicRpcEndpoint: 'https://api.avax-test.network/ext/bc/C/rpc',
  },
  celo: {
    etherscanUrl: 'https://api.celoscan.io/api',
    publicRpcEndpoint: 'https://forno.celo.org',
  },
  celoAlfajores: {
    etherscanUrl: 'https://alfajores.celoscan.io/api',
    publicRpcEndpoint: 'https://alfajores-forno.celo-testnet.org',
  },
  gnosis: {
    etherscanUrl: 'https://api.gnosisscan.io/api',
    publicRpcEndpoint: 'https://safe-transaction.gnosis.io',
  },
  fantom: {
    etherscanUrl: 'https://api.ftmscan.com/api',
    publicRpcEndpoint: 'https://rpcapi.fantom.network',
    rateLimit: 5000,
  },
  fantomTestnet: {
    etherscanUrl: 'https://api-testnet.ftmscan.com/api',
    publicRpcEndpoint: 'https://rpc.testnet.fantom.network',
  },
  zksyncEra: {
    etherscanUrl: 'https://block-explorer-api.mainnet.zksync.io/api',
    publicRpcEndpoint: 'https://mainnet.era.zksync.io',
  },
  zksyncEraTestnet: {
    etherscanUrl: 'https://block-explorer-api.testnets.zksync.dev/api',
    publicRpcEndpoint: 'https://testnet.era.zksync.dev',
  },
  polygonZkevmTestnet: {
    etherscanUrl: 'https://testnet-zkevm.polygonscan.com/api',
    publicRpcEndpoint: 'https://rpc.public.zkevm-test.net',
  },
  polygonZkevm: {
    etherscanUrl: 'https://api-zkevm.polygonscan.com/api',
    publicRpcEndpoint: 'https://zkevm-rpc.com',
  },
  sepolia: {
    etherscanUrl: 'https://api-sepolia.etherscan.io/api',
    publicRpcEndpoint: 'https://rpc.ankr.com/eth_sepolia',
    rateLimit: 5000,
  },
  scrollSepolia: {
    etherscanUrl: 'https://api-sepolia.scrollscan.dev/api',
    publicRpcEndpoint: 'https://rpc.ankr.com/scroll_sepolia_testnet',
  },
  scroll: {
    etherscanUrl: 'https://blockscout.scroll.io/api',
    publicRpcEndpoint: 'https://rpc.ankr.com/scroll',
  },
};
