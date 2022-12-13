const allowedStudioNetworks = ['mainnet', 'rinkeby', 'goerli', 'gnosis'] as const

const validateStudioNetwork = ({ studio, product, network }:{
  studio?: boolean
  product?: 'subgraph-studio'
  network: typeof allowedStudioNetworks[number]
}) => {
  let isStudio = studio || product === 'subgraph-studio'
  let isAllowedNetwork = allowedStudioNetworks.includes(network)

  if (isStudio && !isAllowedNetwork) {
    throw new Error(
      `The Subgraph Studio only allows subgraphs for these networks: ${allowedStudioNetworks.join(
        ', ',
      )}`,
    )
  }
}

export { allowedStudioNetworks, validateStudioNetwork }
