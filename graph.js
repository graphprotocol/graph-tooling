#!/usr/bin/env node

let app = require('commander')
let ipfsAPI = require('ipfs-api')
let jayson = require('jayson')
let path = require('path')
let request = require('request')
const url = require('url')
const { URL } = url

let Compiler = require('./src/cli/compiler')
let TypeGenerator = require('./src/cli/type-generator')
const Logger = require('./src/cli/logger')

function getVerbosity(app) {
  return app.debug ? 'debug' : app.verbose ? 'verbose' : app.verbosity
}

// Helper function to construct a subgraph compiler
function createCompiler(app, subgraphManifest) {
  // Connect to the IPFS node (if a node address was provided)
  let ipfs = app.ipfs ? ipfsAPI(app.ipfs) : undefined

  return new Compiler({
    ipfs,
    subgraphManifest,
    outputDir: app.outputDir,
    outputFormat: app.outputFormat || 'wasm',
    logger: {
      verbosity: getVerbosity(app),
    },
  })
}

function outputDeployConfig() {
  console.error('')
  console.error('Configuration:')
  console.error('')

  if (app.subgraphName === undefined) {
    console.error('  Subgraph name: No name defined with -n/--subgraph-name')
  } else {
    console.error(`  Subgraph name: ${app.subgraphName}`)
  }

  if (app.node === undefined) {
    console.error('  Graph node:    No node defined with -g/--node')
  } else {
    console.error(`  Graph node:    ${app.node}`)
  }

  if (app.ipfs === undefined) {
    console.error('  IPFS:          No node defined with -i/--ipfs')
  } else {
    console.error(`  IPFS:          ${app.ipfs}`)
  }

  console.error('')
}

app
  .version('0.1.0')
  .option(
    '--verbosity <info|verbose|debug>',
    'The log level to use (default: LOG_LEVEL or info)',
    process.env.LOG_LEVEL || 'info'
  )
  .option('--debug', 'Alias for --verbosity debug')
  .option('--verbose', 'Alias for --verbosity verbose')
  .option(
    '-o, --output-dir <path>',
    'Output directory for build artifacts',
    path.resolve(process.cwd(), 'dist')
  )
  .option('-w, --watch', 'Rebuild automatically when files change')
  .option('-g, --node <URL>[:PORT]', 'Graph node')
  .option('-t, --output-format <wasm|wast>', 'Output format (wasm, wast)', 'wasm')
  .option('-i, --ipfs <addr>', 'IPFS node to use for uploading files')
  .option('-n, --subgraph-name <NAME>', 'Subgraph name')
  .option('--api-key <KEY>', 'Graph API key corresponding to the subgraph name')

app
  .command('codegen <subgraph-manifest>')
  .description('Generates TypeScript types for a subgraph')
  .action(subgraphManifest => {
    let generator = new TypeGenerator({
      subgraphManifest,
      outputDir: app.outputDir,
      logger: {
        verbosity: getVerbosity(app),
      },
    })

    // Watch working directory for file updates or additions, trigger
    // type generation (if watch argument specified)
    if (app.watch) {
      generator.watchAndGenerateTypes()
    } else {
      generator.generateTypes()
    }
  })

app
  .command('build <subgraph-manifest>')
  .description('Compiles a subgraph and uploads it to IPFS')
  .action(subgraphManifest => {
    let compiler = createCompiler(app, subgraphManifest)

    // Watch subgraph files for changes or additions, trigger
    // compile (if watch argument specified)
    if (app.watch) {
      compiler.watchAndCompile()
    } else {
      compiler.compile()
    }
  })

app
  .command('deploy <subgraph-manifest>')
  .description('Deploys the subgraph to a graph node')
  .action(subgraphManifest => {
    if (
      app.subgraphName === undefined ||
      app.node === undefined ||
      app.ipfs === undefined
    ) {
      outputDeployConfig()
      console.error('--')
      console.error('For more information run this command with --help')
      process.exitCode = 1
      return
    }

    let compiler = createCompiler(app, subgraphManifest)
    let requestUrl = new URL(app.node)
    if (!requestUrl.port) {
      requestUrl.port = '8020'
    }

    let client = jayson.Client.http(requestUrl)
    if (app.apiKey !== undefined) {
      client.options.headers = { Authorization: 'Bearer ' + app.apiKey }
    }

    let logger = new Logger(0, { verbosity: getVerbosity(app) })

    let deploySubgraph = ipfsHash => {
      logger.status('Deploying to Graph node:', requestUrl)
      logger.info('')
      client.request(
        'subgraph_deploy',
        { name: app.subgraphName, ipfs_hash: ipfsHash },
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
              path.join(requestUrl.toString(), app.subgraphName)
            )
          }
        }
      )
    }

    if (app.watch) {
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
  })

app.command('*', { noHelp: true }).action(args => {
  console.error('Unknown command:', args)
  console.error('--')
  app.help()
})

app.parse(process.argv)
