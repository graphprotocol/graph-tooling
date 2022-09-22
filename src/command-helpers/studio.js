const allowedStudioNetworks = ['mainnet', 'rinkeby', 'goerli', 'gnosis']

const validateStudioNetwork = ({ studio, product, network }) => {
  let isStudio = studio || product === 'subgraph-studio'
  let isAllowedNetwork = allowedStudioNetworks.includes(network)

  if (isStudio && !isAllowedNetwork) {
    throw new Error(`The Subgraph Studio only allows subgraphs for these networks: ${allowedStudioNetworks.join(', ')}`)
  }
}

module.exports = {
  allowedStudioNetworks,
  validateStudioNetwork,
}
