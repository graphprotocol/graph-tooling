#!/usr/bin/env node

const app = require('commander')
const fs = require('fs-extra')
const ipfsHttpClient = require('ipfs-http-client')
const jayson = require('jayson')
const keytar = require('keytar')
const path = require('path')
const pkginfo = require('pkginfo')(module, 'version')
const request = require('request')
const url = require('url')
const { URL } = url
const which = require('which')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const os = require('os')

const Compiler = require('./src/compiler')
const TypeGenerator = require('./src/type-generator')
const Logger = require('./src/logger')

function getVerbosity(app) {
  return app.debug ? 'debug' : app.verbose ? 'verbose' : app.verbosity
}

function createJsonRpcClient(url, { logger }) {
  let params = {
    host: url.hostname,
    port: url.port,
    path: url.pathname,
  }

  if (url.protocol === 'https:') {
    return jayson.Client.https(params)
  } else if (url.protocol === 'http:') {
    return jayson.Client.http(params)
  } else {
    logger.error(
      `Unsupported protocol: ${url.protocol.substring(0, url.protocol.length - 1)}`
    )
    logger.note(
      'The Graph Node URL must be of the following format: http(s)://host[:port]/[path]'
    )
    return null
  }
}

// Helper function to construct a subgraph compiler
function createCompiler(app, cmd, subgraphManifest, { logger }) {
  // Parse the IPFS URL
  let url
  try {
    url = cmd.ipfs ? new URL(cmd.ipfs) : undefined
  } catch (e) {
    logger.error(`Invalid IPFS URL: ${cmd.ipfs}`)
    logger.note(
      'The IPFS URL must be of the following format: http(s)://host[:port]/[path]'
    )
    return null
  }

  // Connect to the IPFS node (if a node address was provided)
  let ipfs = cmd.ipfs
    ? ipfsHttpClient({
        protocol: url.protocol.replace(/[:]+$/, ''),
        host: url.hostname,
        port: url.port,
        'api-path': url.pathname.replace(/\/$/, '') + '/api/v0/',
      })
    : undefined

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

function outputInitConfig(directory, subgraphName) {
  console.error('Configuration:')
  console.error('')
  if (directory === undefined || directory === '') {
    console.error('  Directory:     No directory provided')
  } else {
    console.error(`  Directory:     ${directory}`)
  }
  if (subgraphName === undefined || subgraphName === '') {
    console.error('  Subgraph name: No subgraph name provided')
  } else {
    console.error(`  Subgraph name: ${subgraphName}`)
  }
}

async function identifyAccessToken(app, cmd, logger) {
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
    let logger = new Logger(0, { verbosity: getVerbosity(app) })
    let compiler = createCompiler(
      app,
      cmd,
      subgraphManifest || path.resolve('subgraph.yaml'),
      { logger }
    )

    // Exit with an error code if the compiler couldn't be created
    if (!compiler) {
      process.exitCode = 1
      return
    }

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
      console.error('--')
      outputDeployConfig(cmd, { subgraphName })
      console.error('--')
      console.error('For more information run this command with --help')
      process.exitCode = 1
      return
    }

    let logger = new Logger(0, { verbosity: getVerbosity(app) })

    let compiler = createCompiler(
      app,
      cmd,
      subgraphManifest || path.resolve('subgraph.yaml'),
      { logger }
    )

    // Exit with an error code if the compiler couldn't be created
    if (!compiler) {
      process.exitCode = 1
      return
    }

    let requestUrl = new URL(cmd.node)
    let client = createJsonRpcClient(requestUrl, { logger })

    // Exit with an error code if the client couldn't be created
    if (!client) {
      process.exitCode = 1
      return
    }

    // Use the access token, if one is set
    let accessToken = await identifyAccessToken(app, cmd, logger)
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

            const base = requestUrl.protocol + '//' + requestUrl.hostname

            let playground = res.playground
            let queries = res.queries
            let subscriptions = res.subscriptions

            // Add a base URL if graph-node did not return the full URL
            if (playground.charAt(0) === ':') {
              playground = base + playground
            }
            if (queries.charAt(0) === ':') {
              queries = base + queries
            }
            if (subscriptions.charAt(0) === ':') {
              subscriptions = base + subscriptions
            }

            let hostedService = cmd.node.match(/thegraph.com/)
            if (hostedService) {
              logger.status(
                `Live deployment:   `,
                `https://thegraph.com/explorer/subgraph/${subgraphName}`
              )
            }
            logger.status(
              'Subgraph endpoints:',
              [
                hostedService ? '' : `\nPlayground:         ${playground}`,
                `Queries (HTTP):     ${queries}`,
                `Subscriptions (WS): ${subscriptions}`,
              ]
                .filter(msg => msg !== undefined)
                .join('\n')
            )
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
    let client = createJsonRpcClient(requestUrl, { logger })

    // Exit with an error code if the client couldn't be created
    if (!client) {
      process.exitCode = 1
      return
    }

    // Use the access token, if one is set
    let accessToken = await identifyAccessToken(app, cmd, logger)
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
    let client = createJsonRpcClient(requestUrl, { logger })

    // Exit with an error code if the client couldn't be created
    if (!client) {
      process.exitCode = 1
      return
    }

    // Use the access token, if one is set
    let accessToken = await identifyAccessToken(app, cmd, logger)
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

/**
 * graph init
 */
app
  .command('init [SUBGRAPH_NAME] [DIRECTORY]')
  .description('Creates a new subgraph project with basic scaffolding')
  .option('--allow-simple-name', 'Use a subgraph name without a prefix component', false)
  .action(async (subgraphName, directory, cmd) => {
    if (!subgraphName || subgraphName === '') {
      console.error('Cannot initialize new subgraph')
      console.error('--')
      outputInitConfig(directory, subgraphName)
      process.exitCode = 1
      return
    }

    let logger = new Logger(0, { verbosity: getVerbosity(app) })

    if (!cmd.allowSimpleName && subgraphName == path.basename(subgraphName)) {
      logger.fatal(
        `Subgraph name "${subgraphName}" needs to have the format "<PREFIX>/${subgraphName}".
When using the Hosted Service at https://thegraph.com, <PREFIX> is
going to be the name of your user or organization account.

You can bypass this check with --allow-simple-name.`
      )
      logger.info(`
Examples:
$ graph init ${os.userInfo().username}/${subgraphName}${directory ? ` ${directory}` : ''}
$ graph init ${subgraphName}${directory ? ` ${directory}` : ''} --allow-simple-name`)
      process.exitCode = 1
      return
    }

    // Default to the subgraph name as the directory name
    directory = directory || path.basename(subgraphName)

    if (fs.existsSync(directory)) {
      logger.fatal(`Directory or file "${directory}" already exists`)
      process.exitCode = 1
      return
    }

    let git = which.sync('git', { nothrow: true })
    if (git === null) {
      logger.fatal(
        `Git was not found on your system. Please install 'git' so it is in $PATH.`
      )
      process.exitCode = 1
      return
    }

    let yarn = which.sync('yarn', { nothrow: true })
    let npm = which.sync('npm', { nothrow: true })
    if (!yarn && !npm) {
      logger.fatal(
        `Neither Yarn nor NPM were found on your system. Please install one of them.`
      )
      process.exitCode = 1
      return
    }
    let installCommand = yarn ? 'yarn' : 'npm install'
    let codegenCommand = yarn ? 'yarn codegen' : 'npm run codegen'
    let deployCommand = yarn ? 'yarn deploy' : 'npm run deploy'

    // Clone the example subgraph repository
    try {
      await exec(
        `${git} clone http://github.com/graphprotocol/example-subgraph ${directory}`
      )
    } catch (e) {
      logger.fatal(`Failed to clone example subgraph repository:`, e)
      process.exitCode = 1
      return
    }

    // Update package.json to match the subgraph name
    try {
      // Load package.json
      let pkgJsonFilename = path.join(directory, 'package.json')
      let pkgJson = JSON.parse(fs.readFileSync(pkgJsonFilename, { encoding: 'utf-8' }))

      pkgJson.name = path.basename(subgraphName)
      Object.keys(pkgJson.scripts).forEach(name => {
        pkgJson.scripts[name] = pkgJson.scripts[name].replace('example', subgraphName)
      })
      delete pkgJson['license']
      delete pkgJson['repository']

      // Write package.json
      let output = JSON.stringify(pkgJson, undefined, 2)
      fs.writeFileSync(pkgJsonFilename, output, { encoding: 'utf-8' })
    } catch (e) {
      logger.fatal(`Failed to preconfigure the subgraph:`, e)
      process.exitCode = 1
      fs.removeSync(directory)
      return
    }

    // Reset the git repository
    try {
      await exec(
        `\
cd ${directory} \
  && rm -rf .git \
  && git init \
  && git add --all \
  && git commit -m "Initial commit"`
      )
    } catch (e) {
      logger.fatal(`Failed to initialize the subgraph directory:`, e)
      process.exitCode = 1
      return
    }

    logger.status(
      `Subgraph "${subgraphName}" created in ${path.relative(
        process.cwd(),
        directory
      )}/.`,
      `

Next steps:

1. Run \`graph auth https://api.thegraph.com/deploy/ <your access token>\`
   to authenticate with the hosted service. You can get the access token from
   https://thegraph.com/explorer/dashboard/.

2. Type \`cd ${directory}\` to enter the subgraph.

3. Run \`${installCommand}\` to install dependencies.

4. Run \`${codegenCommand}\` to generate code from contract ABIs and the GraphQL schema.

5. Run \`${deployCommand}\` to deploy the subgraph to
   https://thegraph.com/explorer/subgraph/${subgraphName}.
`
    )

    logger.info(
      `\
Make sure to visit the documentation on https://thegraph.com/docs/ for
further information.`
    )
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
