export const allowedStudioNetworks = [
  'mainnet',
  'rinkeby',
  'goerli',
  'gnosis',
  'chapel',
  'optimism-goerli',
  'clover',
  'fantom-testnet',
  'arbitrum-goerli',
  'fuji',
  'celo-alfajores',
  'mumbai',
  'aurora-testnet',
  'near-testnet',
  'theta-testnet-001',
  'osmo-test-4',
  'base-testnet',
  'celo',
  'arbitrum-one',
  'avalanche',
  'zksync-era',
] as const;

export const validateStudioNetwork = ({
  studio,
  product,
  network,
}: {
  studio?: string | boolean;
  product?: string;
  network: string;
}) => {
  const isStudio = studio || product === 'subgraph-studio';
  const isAllowedNetwork = allowedStudioNetworks.includes(
    // @ts-expect-error we're checking if the network is allowed
    network,
  );

  if (isStudio && !isAllowedNetwork) {
    throw new Error(
      `The Subgraph Studio only allows subgraphs for these networks: ${allowedStudioNetworks.join(
        ', ',
      )}`,
    );
  }
};
