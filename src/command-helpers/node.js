const URL = require('url').URL
const { print } = require('gluegun/toolbox')

const SUBGRAPH_STUDIO_URL = 'https://api.studio.thegraph.com/deploy/'
const HOSTED_SERVICE_URL = 'https://api.thegraph.com/deploy/'

const validateNodeUrl = node => new URL(node)

const normalizeNodeUrl = node => new URL(node).toString()

function chooseNodeUrl ({ product, studio, node, allowSimpleName }) {
  if (node) {
    try {
      validateNodeUrl(node)
    } catch (e) {
      print.error(`Graph node "${node}" is invalid: ${e.message}`)
      process.exit(1)
    }
  } else {
    if (studio) {
      product = 'subgraph-studio'
    }
    switch (product) {
      case 'subgraph-studio':
        node = SUBGRAPH_STUDIO_URL
        break
      case 'hosted-service':
        node = HOSTED_SERVICE_URL
        break
    }
  }
  if ((node && node.match(/studio/)) || product === 'subgraph-studio') {
    allowSimpleName = true
  }
  return { node, allowSimpleName }
}

module.exports = {
  validateNodeUrl,
  normalizeNodeUrl,
  chooseNodeUrl
}
