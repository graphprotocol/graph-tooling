#!/usr/bin/env node

let args = require('commander')
let jayson = require('jayson')
let path = require('path')
let request = require('request')
let app = require('./src/app')
const Logger = require('./src/logger')
const url = require('url')
const { URL } = url

app.initApp()
app.addBuildCommand()

args
  .option('-n, --subgraph-name <NAME>', 'subgraph name')
  .option('--node <URL>[:PORT]', 'graph node')
  .option('--api-key <KEY>', 'key corresponding to the subgraph name')

app.parse()

if (!args.node || !args.subgraphName) {
  args.help()
}

let compiler = app.compilerFromArgs()

let requestUrl = new URL(args.node)
if (!requestUrl.port) {
  requestUrl.port = '8020'
}

let client = jayson.Client.http(requestUrl)
client.options.headers = { Authorization: 'Bearer ' + args.apiKey }
let logger = new Logger(0, { verbosity: args.verbosity })

let deploySubgraph = ipfsHash => {
  logger.status('Deploying to Graph node:', requestUrl)
  logger.info('')

  client.request(
    'subgraph_deploy',
    { name: args.subgraphName, ipfs_hash: ipfsHash },
    function(requestError, jsonRpcError, res) {
      if (requestError) {
        logger.fatal('HTTP error deploying the subgraph:', requestError.code)
      }
      if (jsonRpcError) {
        logger.fatal('Error deploying the subgraph:', jsonRpcError.message)
      }
      if (!requestError && !jsonRpcError) {
        logger.status(
          'Deployed to Graph node:',
          path.join(requestUrl.toString(), args.subgraphName)
        )
      }
    }
  )
}

if (args.watch) {
  compiler
    .watchAndCompile(ipfsHash => {
      if (ipfsHash !== undefined) {
        deploySubgraph(ipfsHash)
      }
    })
    .catch(e => {
      logger.fatal('Failed to watch, compile or deploy the subgraph:', e)
    })
} else {
  compiler.compile().then(function(ipfsHash) {
    if (ipfsHash === undefined) {
      // Compilation failed, not deploying.
      process.exitCode = 1
      return
    }
    deploySubgraph(ipfsHash)
  })
}
