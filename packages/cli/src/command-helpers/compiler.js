const URL = require('url').URL
import ipfsHttpClient from 'ipfs-http-client'
import toolbox from 'gluegun/toolbox'
import Compiler from '../compiler'

// Helper function to construct a subgraph compiler
const createCompiler = (
  manifest,
  { ipfs, headers, outputDir, outputFormat, skipMigrations, blockIpfsMethods, protocol },
) => {
  // Parse the IPFS URL
  let url
  try {
    url = ipfs ? new URL(ipfs) : undefined
  } catch (e) {
    toolbox.print.error(`Invalid IPFS URL: ${ipfs}
The IPFS URL must be of the following format: http(s)://host[:port]/[path]`)
    return null
  }

  // Connect to the IPFS node (if a node address was provided)
  ipfs = ipfs
    ? ipfsHttpClient({
        protocol: url.protocol.replace(/[:]+$/, ''),
        host: url.hostname,
        port: url.port,
        'api-path': url.pathname.replace(/\/$/, '') + '/api/v0/',
        headers,
      })
    : undefined

  return new Compiler({
    ipfs,
    subgraphManifest: manifest,
    outputDir: outputDir,
    outputFormat: outputFormat,
    skipMigrations,
    blockIpfsMethods,
    protocol,
  })
}

export { createCompiler }
