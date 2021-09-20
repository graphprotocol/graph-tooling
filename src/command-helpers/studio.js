const validateStudioNetwork = ({ studio, product, network }) => {
  let isStudio = studio || product === 'subgraph-studio'
  let isEthereumMainnet = network === 'mainnet'

  if (isStudio && !isEthereumMainnet) {
    throw new Error(`Non Ethereum mainnet subgraphs should not be deployed to the studio`)
  }
}

module.exports = {
  validateStudioNetwork,
}
