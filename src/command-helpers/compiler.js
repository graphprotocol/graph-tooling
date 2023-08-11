const URL = require('url').URL
const ipfsHttpClient = require('ipfs-http-client')
const toolbox = require('gluegun/toolbox')
const Compiler = require('../compiler')

/**
 * Appends /api/v0 to the end of a The Graph IPFS URL
 */
function appendApiVersionForGraph(inputString) {
  // Check if the input string is a valid The Graph IPFS URL
  const pattern = /^(https?:\/\/)?([\w-]+\.)+thegraph\.com\/ipfs\/?$/
  if (pattern.test(inputString)) {
    // account for trailing slash
    if (inputString.endsWith('/')) {
      return inputString.slice(0, -1) + '/api/v0'
    }
    return inputString + '/api/v0'
  }
  return inputString
}

// Helper function to construct a subgraph compiler
const createCompiler = (manifest, { ipfs, outputDir, outputFormat, skipMigrations }) => {
  // Parse the IPFS URL
  try {
    if (ipfs && typeof ipfs === 'string') new URL(ipfs)
  } catch (e) {
    toolbox.print.error(`Invalid IPFS URL: ${ipfs}
The IPFS URL must be of the following format: http(s)://host[:port]/[path]`)
    return null
  }

  // Connect to the IPFS node (if a node address was provided)
  const ipfsClient = ipfs
    ? ipfsHttpClient.create({ url: appendApiVersionForGraph(ipfs.toString()) })
    : undefined

  return new Compiler({
    ipfs: ipfsClient,
    subgraphManifest: manifest,
    outputDir: outputDir,
    outputFormat: outputFormat,
    skipMigrations,
  })
}

module.exports = {
  createCompiler,
}
