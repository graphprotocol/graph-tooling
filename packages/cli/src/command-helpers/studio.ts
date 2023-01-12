export const allowedStudioNetworks = ['mainnet', 'rinkeby', 'goerli', 'gnosis'] as const

export const validateStudioNetwork = ({
  studio,
  product,
  network,
}: {
  studio?: string | boolean
  product?: string
  network: string
}) => {
  let isStudio = studio || product === 'subgraph-studio'
  let isAllowedNetwork = allowedStudioNetworks.includes(
    // @ts-expect-error we're checking if the network is allowed
    network,
  )

  if (isStudio && !isAllowedNetwork) {
    throw new Error(
      `The Subgraph Studio only allows subgraphs for these networks: ${allowedStudioNetworks.join(
        ', ',
      )}`,
    )
  }
}
