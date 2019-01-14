#!/usr/bin/env node

const app = require('commander')
const ipfsAPI = require('ipfs-api')
const jayson = require('jayson')
const keytar = require('keytar')
const path = require('path')
const pkginfo = require('pkginfo')(module, 'version')
const request = require('request')
const url = require('url')
const { URL } = url

const Compiler = require('./src/compiler')
const TypeGenerator = require('./src/type-generator')
const Logger = require('./src/logger')

function getVerbosity(app) {
  return app.debug ? 'debug' : app.verbose ? 'verbose' : app.verbosity
}

// Helper function to construct a subgraph compiler
function createCompiler(app, cmd, subgraphManifest) {
  // Connect to the IPFS node (if a node address was provided)
  let ipfs = cmd.ipfs ? ipfsAPI(cmd.ipfs) : undefined

  return new Compiler({
    ipfs,
    subgraphManifest,
    outputDir: cmd.outputDir,
    outputFormat: cmd.outputFormat || 'wasm',
    logger: {
      verbosity: getVerbosity(app),
    },
  })
}

function normalizeNodeUrl(node) {
  return new URL(node).toString()
}

function outputNameAndNodeConfig(cmd, { subgraphName } = { subgraphName: undefined }) {
  console.error('Configuration:')
  console.error('')
  if (subgraphName === null || subgraphName === undefined) {
    console.error('  Subgraph name: Not provided')
  } else {
    console.error(`  Subgraph name: ${subgraphName}`)
  }
  if (cmd.node === undefined) {
    console.error('  Graph node:    No node defined with -g/--node')
  } else {
    console.error(`  Graph node:    ${cmd.node}`)
  }
}

function outputDeployConfig(cmd, { subgraphName }) {
  outputNameAndNodeConfig(cmd, { subgraphName })
  if (cmd.ipfs === undefined) {
    console.error('  IPFS:          No node defined with -i/--ipfs')
  } else {
    console.error(`  IPFS:          ${cmd.ipfs}`)
  }
  console.error('')
}

function outputAuthConfig(node, accessToken) {
  console.error('Configuration:')
  console.error('')
  if (node === undefined) {
    console.error('  Graph node:   No node defined')
  } else {
    console.error(`  Graph node:   ${node}`)
  }
  if (accessToken === undefined) {
    console.error('  Access token: Missing')
  } else if (accessToken.length > 200) {
    console.error('  AccessToken: Access token is too long')
  }
}

async function identifyAccessToken(app, cmd) {
  // Determine the access token to use, if any:
  // - First try using --access-token, if provided
  // - Then see if we have an access token set for the Graph node
  if (cmd.accessToken !== undefined) {
    return cmd.accessToken
  } else {
    try {
      let node = normalizeNodeUrl(cmd.node)
      return await keytar.getPassword('graphprotocol-auth', node)
    } catch (e) {
      if (process.platform === 'win32') {
        logger.errorWarning(
          `Could not get access token from Windows Credential Vault:`,
          e
        )
      } else if (process.platform === 'darwin') {
        logger.errorWarning(`Could not get access token from macOS Keychain:`, e)
      } else if (process.platform === 'linux') {
        logger.errorWarning(
          `Could not get access token from libsecret ` +
            `(usually gnome-keyring or ksecretservice):`,
          e
        )
      } else {
        logger.errorWarning(
          `Could not get access token from OS secret storage service:`,
          e
        )
      }
      logger.status(`Continuing without an access token`)
    }
  }
}

/**
 * Global app configuration and options
 */
app
  .version(module.exports.version)
  .option(
    '--verbosity <info|verbose|debug>',
    'The log level to use (default: LOG_LEVEL or info)',
    process.env.LOG_LEVEL || 'info'
  )
  .option('--debug', 'Alias for --verbosity debug')
  .option('--verbose', 'Alias for --verbosity verbose')

/**
 * graph codegen
 */
app
  .command('codegen [SUBGRAPH_MANIFEST]')
  .description('Generates TypeScript types for a subgraph')
  .option(
    '-o, --output-dir <PATH>',
    'Output directory for generated types',
    path.resolve(process.cwd(), 'types')
  )
  .option('-w, --watch', 'Regenerate types automatically when files change')
  .action((subgraphManifest, cmd) => {
    let generator = new TypeGenerator({
      subgraphManifest: subgraphManifest || path.resolve('subgraph.yaml'),
      outputDir: cmd.outputDir,
      logger: {
        verbosity: getVerbosity(app),
      },
    })

    // Watch working directory for file updates or additions, trigger
    // type generation (if watch argument specified)
    if (cmd.watch) {
      generator.watchAndGenerateTypes()
    } else {
      if (!generator.generateTypes()) {
        process.exitCode = 1
      }
    }
  })

/**
 * graph build
 */
app
  .command('build [SUBGRAPH_MANIFEST]')
  .description('Compiles a subgraph and uploads it to IPFS')
  .option('-i, --ipfs <ADDR>', 'IPFS node to use for uploading files')
  .option('-n, --subgraph-name <NAME>', 'Subgraph name')
  .option(
    '-o, --output-dir <PATH>',
    'Output directory for build results',
    path.resolve(process.cwd(), 'dist')
  )
  .option('-t, --output-format <wasm|wast>', 'Output format (wasm, wast)', 'wasm')
  .option('-w, --watch', 'Rebuild automatically when files change')
  .action((subgraphManifest, cmd) => {
    let compiler = createCompiler(
      app,
      cmd,
      subgraphManifest || path.resolve('subgraph.yaml')
    )

    // Watch subgraph files for changes or additions, trigger
    // compile (if watch argument specified)
    if (cmd.watch) {
      compiler.watchAndCompile()
    } else {
      compiler.compile().then(result => {
        if (result === false) {
          process.exitCode = 1
        }
      })
    }
  })

/**
 * graph auth
 */
app
  .command('auth [NODE] [ACCESS_TOKEN]')
  .description('Sets the access token to use when deploying to a Graph node')
  .action(async (nodeUrl, accessToken) => {
    let logger = new Logger(0, { verbosity: getVerbosity(app) })
    if (accessToken === undefined || nodeUrl === undefined || accessToken.length > 200) {
      console.error('Cannot set the access token')
      console.error('--')
      outputAuthConfig(nodeUrl, accessToken)
      console.error('--')
      console.error('For more information run this command with --help')
      process.exitCode = 1
      return
    }
    try {
      let node = normalizeNodeUrl(nodeUrl)
      await keytar.setPassword('graphprotocol-auth', node, accessToken)
      logger.status('Access token set for Graph node:', node)
    } catch (e) {
      if (process.platform === 'win32') {
        logger.error(`Error storing access token in Windows Credential Vault:`, e)
      } else if (process.platform === 'darwin') {
        logger.error(`Error storing access token in macOS Keychain:`, e)
      } else if (process.platform === 'linux') {
        logger.error(
          `Error storing access token with libsecret ` +
            `(usually gnome-keyring or ksecretservice):`,
          e
        )
      } else {
        logger.error(`Error storing access token in OS secret storage service:`, e)
      }
      process.exitCode = 1
    }
  })

/**
 * graph deploy
 */
app
  .command('deploy [SUBGRAPH_NAME] [SUBGRAPH_MANIFEST]')
  .description('Deploys the subgraph to a graph node')
  .option('-g, --node <URL>', 'Graph node to deploy to')
  .option('-i, --ipfs <ADDR>', 'IPFS node to use for uploading files')
  .option('--access-token <TOKEN>', 'Graph access token')
  .option(
    '-o, --output-dir <PATH>',
    'Output directory for build results',
    path.resolve(process.cwd(), 'dist')
  )
  .option('-w, --watch', 'Rebuild and redeploy automatically when files change')
  .action(async (subgraphName, subgraphManifest, cmd) => {
    if (subgraphName === undefined || cmd.node === undefined || cmd.ipfs === undefined) {
      console.error('Cannot deploy the subgraph')
      outputDeployConfig(cmd, { subgraphName })
      console.error('--')
      console.error('For more information run this command with --help')
      process.exitCode = 1
      return
    }

    let compiler = createCompiler(
      app,
      cmd,
      subgraphManifest || path.resolve('subgraph.yaml')
    )

    let requestUrl = new URL(cmd.node)
    let client = jayson.Client.http(requestUrl)

    let logger = new Logger(0, { verbosity: getVerbosity(app) })

    // Use the access token, if one is set
    let accessToken = await identifyAccessToken(app, cmd)
    if (accessToken !== undefined && accessToken !== null) {
      client.options.headers = { Authorization: 'Bearer ' + accessToken }
    }

    let deploySubgraph = ipfsHash => {
      logger.status('Deploying to Graph node:', requestUrl)
      client.request(
        'subgraph_deploy',
        { name: subgraphName, ipfs_hash: ipfsHash },
        function(requestError, jsonRpcError, res) {
          if (requestError) {
            logger.fatal('HTTP error deploying the subgraph:', requestError.code)
          }
          if (jsonRpcError) {
            logger.fatal('Error deploying the subgraph:', jsonRpcError.message)
          }
          if (!requestError && !jsonRpcError) {
            logger.status('Deployed successfully')

            // Assume that the host is the same.
            // In the future the deployment router should also return the host.
            let base = requestUrl.protocol + '//' + requestUrl.hostname
            logger.status('Playground:        ', base + res.playground)
            logger.status('Queries (HTTP):    ', base + res.queries)
            logger.status('Subscriptions (WS):', base + res.subscriptions)
          }
        }
      )
    }

    if (cmd.watch) {
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
      compiler.compile().then(function(result) {
        if (result === undefined || result === false) {
          // Compilation failed, not deploying.
          process.exitCode = 1
          return
        }
        deploySubgraph(result)
      })
    }
  })

app
  .command('create [SUBGRAPH_NAME]')
  .description('Creates a named subgraph name')
  .option('-g, --node <URL>', 'Graph node to create the subgraph in')
  .option('--access-token <TOKEN>', 'Graph access token')
  .action(async (subgraphName, cmd) => {
    if (subgraphName === undefined || cmd.node === undefined) {
      console.error('Cannot create the subgraph')
      console.error('--')
      outputNameAndNodeConfig(cmd, { subgraphName })
      console.error('--')
      console.error('For more information run this command with --help')
      process.exitCode = 1
      return
    }

    let logger = new Logger(0, { verbosity: getVerbosity(app) })

    let requestUrl = new URL(cmd.node)
    let client = jayson.Client.http(requestUrl)

    // Use the access token, if one is set
    let accessToken = await identifyAccessToken(app, cmd)
    if (accessToken !== undefined && accessToken !== null) {
      client.options.headers = { Authorization: 'Bearer ' + accessToken }
    }

    logger.status('Creating subgraph in Graph node:', requestUrl)
    client.request('subgraph_create', { name: subgraphName }, function(
      requestError,
      jsonRpcError,
      res
    ) {
      if (requestError) {
        logger.fatal('HTTP error creating the subgraph:', requestError.code)
      }
      if (jsonRpcError) {
        logger.fatal('Error creating the subgraph:', jsonRpcError.message)
      }
      if (!requestError && !jsonRpcError) {
        logger.status('Created subgraph:', subgraphName)
      }
    })
  })

app
  .command('remove [SUBGRAPH_NAME]')
  .description('Removes subgraph from node')
  .option('-g, --node <URL>', 'Graph node to remove the subgraph from')
  .option('--access-token <TOKEN>', 'Graph access token')
  .action(async (subgraphName, cmd) => {
    if (subgraphName === undefined || cmd.node === undefined) {
      console.error('Cannot remove the subgraph')
      console.error('--')
      outputNameAndNodeConfig(cmd, { subgraphName })
      console.error('--')
      console.error('For more information run this command with --help')
      process.exitCode = 1
      return
    }

    let logger = new Logger(0, { verbosity: getVerbosity(app) })

    let requestUrl = new URL(cmd.node)
    let client = jayson.Client.http(requestUrl)

    // Use the access token, if one is set
    let accessToken = await identifyAccessToken(app, cmd)
    if (accessToken !== undefined && accessToken !== null) {
      client.options.headers = { Authorization: 'Bearer ' + accessToken }
    }

    logger.status('Removing subgraph from Graph node:', requestUrl)
    client.request('subgraph_remove', { name: subgraphName }, function(
      requestError,
      jsonRpcError,
      res
    ) {
      if (requestError) {
        logger.fatal('HTTP error removing the subgraph:', requestError.code)
      }
      if (jsonRpcError) {
        logger.fatal('Error removing the subgraph:', jsonRpcError.message)
      }
      if (!requestError && !jsonRpcError) {
        logger.status('Removed subgraph:', subgraphName)
      }
    })
  })

app.command('*', { noHelp: true }).action(args => {
  console.error('Unknown command:', args)
  console.error('--')
  app.help()
})

app.parse(process.argv)

// If no command was supplied, output the help text
if (app.args.length === 0) {
  app.help()
}
