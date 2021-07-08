const toolbox = require('gluegun/toolbox')
const { normalizeNodeUrl } = require('./node')

const fs = require('fs')
const path = require('path')
const homedir = require('os').homedir()

const CONFIG_PATH = path.join(homedir, '/.graph-cli.json')
const getConfig = () => {
  let config
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH))
  } catch {
    config = {}
  }
  return config
 }

const identifyDeployKey = async (node, deployKey) => {
  // Determine the deploy key to use, if any:
  // - First try using --deploy-key, if provided
  // - Then see if we have a deploy key set for the Graph node
  if (deployKey !== undefined) {
    return deployKey
  } else {
    try {
      node = normalizeNodeUrl(node)
      const config = getConfig()
      return config[node]
    } catch (e) {
      toolbox.print.warning(`Could not get deploy key: ${e.message}`)
      toolbox.print.info(`Continuing without a deploy key\n`)
    }
  }
}

const saveDeployKey = async (node, deployKey) => {
  try {
    node = normalizeNodeUrl(node)
    const config = getConfig()
    config[node] = deployKey
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config))
  } catch (e) {
    throw new Error(`Error storing deploy key: ${e.message}`)
  }
}

module.exports = {
  identifyDeployKey,
  saveDeployKey,
}
