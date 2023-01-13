const URL = require('url').URL
import chalk from 'chalk'
import path from 'path'
import { GluegunToolbox } from 'gluegun'

import { identifyDeployKey } from '../command-helpers/auth'
import { createCompiler } from '../command-helpers/compiler'
import { fixParameters } from '../command-helpers/gluegun'
import { createJsonRpcClient } from '../command-helpers/jsonrpc'
import { chooseNodeUrl } from '../command-helpers/node'
import { DEFAULT_IPFS_URL } from '../command-helpers/ipfs'
import {
  assertManifestApiVersion,
  assertGraphTsVersion,
} from '../command-helpers/version'
import * as DataSourcesExtractor from '../command-helpers/data-sources'
import { validateStudioNetwork } from '../command-helpers/studio'
import Protocol from '../protocols'
import { updateSubgraphNetwork } from '../command-helpers/network'

const HELP = `
${chalk.bold('graph deploy')} [options] ${chalk.bold('<subgraph-name>')} ${chalk.bold(
  '[<subgraph-manifest>]',
)}

Options:

        --product <subgraph-studio|hosted-service>
                                Selects the product to which to deploy
        --studio                  Shortcut for --product subgraph-studio
  -g,   --node <node>             Graph node to which to deploy
        --deploy-key <key>        User deploy key
  -l    --version-label <label>   Version label used for the deployment
  -h,   --help                    Show usage information
  -i,   --ipfs <node>             Upload build results to an IPFS node (default: ${DEFAULT_IPFS_URL})
  -hdr, --headers <map>           Add custom headers that will be used by the IPFS HTTP client (default: {})
        --debug-fork              ID of a remote subgraph whose store will be GraphQL queried
  -o,   --output-dir <path>       Output directory for build results (default: build/)
        --skip-migrations         Skip subgraph migrations (default: false)
  -w,   --watch                   Regenerate types when subgraph files change (default: false)
        --network <name>          Network configuration to use from the networks config file
        --network-file <path>     Networks config file path (default: "./networks.json")
`

export interface DeployOptions {
  product?: 'subgraph-studio' | 'hosted-service'
  studio?: boolean
  node?: string
  deployKey?: string
  versionLabel?: string
  help?: boolean
  ipfs?: string
  headers?: Record<string, string>
  debugFork?: boolean
  outputDir?: string
  skipMigrations?: boolean
  watch?: boolean
  network?: string
  networkFile?: string
}

const processForm = async (
  toolbox: GluegunToolbox,
  { product, studio, node, versionLabel }: DeployOptions,
) => {
  const questions = [
    {
      type: 'select',
      name: 'product',
      message: 'Product for which to deploy',
      choices: ['subgraph-studio', 'hosted-service'],
      skip:
        product === 'subgraph-studio' ||
        product === 'hosted-service' ||
        studio !== undefined ||
        node !== undefined,
    },
    {
      type: 'input',
      name: 'versionLabel',
      message: 'Version Label (e.g. v0.0.1)',
      skip: versionLabel !== undefined,
    },
  ]

  try {
    const answers = await toolbox.prompt.ask(questions)
    return answers
  } catch (e) {
    return undefined
  }
}

export default {
  description: 'Deploys the subgraph to a Graph node',
  run: async (toolbox: GluegunToolbox) => {
    // Obtain tools
    const { filesystem, print } = toolbox

    // Parse CLI parameters
    let {
      product,
      studio,
      deployKey,
      accessToken,
      versionLabel,
      l,
      g,
      h,
      i,
      help,
      ipfs,
      headers,
      hdr,
      node,
      o,
      outputDir,
      skipMigrations,
      w,
      watch,
      debugFork,
      network,
      networkFile,
    } = toolbox.parameters.options

    // Support both long and short option variants
    help = help || h
    ipfs = ipfs || i || DEFAULT_IPFS_URL
    headers = headers || hdr || '{}'
    node = node || g
    outputDir = outputDir || o
    watch = watch || w
    versionLabel = versionLabel || l

    try {
      headers = JSON.parse(headers)
    } catch (e) {
      print.error('Please make sure headers is a valid JSON value')
      process.exitCode = 1
      return
    }

    let subgraphName: string, manifest: string
    try {
      ;[subgraphName, manifest] = fixParameters(toolbox.parameters, {
        h,
        help,
        w,
        watch,
        studio,
      })
    } catch (e) {
      print.error(e.message)
      process.exitCode = 1
      return
    }

    // Fall back to default values for options / parameters
    outputDir = outputDir && outputDir !== '' ? outputDir : filesystem.path('build')
    manifest =
      manifest !== undefined && manifest !== ''
        ? manifest
        : filesystem.resolve('subgraph.yaml')
    networkFile =
      networkFile !== undefined && networkFile !== ''
        ? networkFile
        : filesystem.resolve('networks.json')

    try {
      const dataSourcesAndTemplates = await DataSourcesExtractor.fromFilePath(manifest)

      for (const { network } of dataSourcesAndTemplates) {
        validateStudioNetwork({ studio, product, network })
      }
    } catch (e) {
      print.error(e.message)
      process.exitCode = 1
      return
    }

    // Show help text if requested
    if (help) {
      print.info(HELP)
      return
    }

    ;({ node } = chooseNodeUrl({ product, studio, node }))
    if (!node) {
      const inputs = await processForm(toolbox, {
        product,
        studio,
        node,
        versionLabel: 'skip', // determine label requirement later
      })
      if (inputs === undefined) {
        process.exit(1)
      }
      product = inputs.product
      ;({ node } = chooseNodeUrl({
        product,
        studio,
        node,
      }))
    }

    // Validate the subgraph name
    if (!subgraphName) {
      print.error(
        `No subgraph ${
          product == 'subgraph-studio' || studio ? 'slug' : 'name'
        } provided`,
      )
      print.info(HELP)
      process.exitCode = 1
      return
    }

    // Validate node
    if (!node) {
      print.error(`No Graph node provided`)
      print.info(HELP)
      process.exitCode = 1
      return
    }

    // Validate IPFS
    if (!ipfs) {
      print.error(`No IPFS node provided`)
      print.info(HELP)
      process.exitCode = 1
      return
    }

    let protocol
    try {
      // Checks to make sure deploy doesn't run against
      // older subgraphs (both apiVersion and graph-ts version).
      //
      // We don't want the deploy to run without these conditions
      // because that would mean the CLI would try to compile code
      // using the wrong AssemblyScript compiler.
      await assertManifestApiVersion(manifest, '0.0.5')
      await assertGraphTsVersion(path.dirname(manifest), '0.25.0')

      const dataSourcesAndTemplates = await DataSourcesExtractor.fromFilePath(manifest)

      protocol = Protocol.fromDataSources(dataSourcesAndTemplates)
    } catch (e) {
      print.error(e.message)
      process.exitCode = 1
      return
    }

    if (network) {
      let identifierName = protocol.getContract()!.identifierName()
      await updateSubgraphNetwork(toolbox, manifest, network, networkFile, identifierName)
    }

    const isStudio = node.match(/studio/)
    const isHostedService = node.match(/thegraph.com/) && !isStudio

    let compiler = createCompiler(manifest, {
      ipfs,
      headers,
      outputDir,
      outputFormat: 'wasm',
      skipMigrations,
      blockIpfsMethods: isStudio, // Network does not support publishing subgraphs with IPFS methods
      protocol,
    })

    // Exit with an error code if the compiler couldn't be created
    if (!compiler) {
      process.exitCode = 1
      return
    }

    // Ask for label if not on hosted service
    if (!versionLabel && !isHostedService) {
      const inputs = await processForm(toolbox, {
        product,
        studio,
        node,
        versionLabel,
      })
      if (inputs === undefined) {
        process.exit(1)
      }
      versionLabel = inputs.versionLabel
    }

    let requestUrl = new URL(node)
    const client = createJsonRpcClient(requestUrl)

    // Exit with an error code if the client couldn't be created
    if (!client) {
      process.exitCode = 1
      return
    }

    // Use the deploy key, if one is set
    if (!deployKey && accessToken) {
      deployKey = accessToken // backwards compatibility
    }
    deployKey = await identifyDeployKey(node, deployKey)
    if (deployKey !== undefined && deployKey !== null) {
      // @ts-expect-error options property seems to exist
      client.options.headers = { Authorization: 'Bearer ' + deployKey }
    }

    let deploySubgraph = async (ipfsHash: string) => {
      let spinner = print.spin(`Deploying to Graph node ${requestUrl}`)
      //       `Failed to deploy to Graph node ${requestUrl}`,
      client.request(
        'subgraph_deploy',
        {
          name: subgraphName,
          ipfs_hash: ipfsHash,
          version_label: versionLabel,
          debug_fork: debugFork,
        },
        async (
          // @ts-expect-error TODO: why are the arguments not typed?
          requestError,
          // @ts-expect-error TODO: why are the arguments not typed?
          jsonRpcError,
          // @ts-expect-error TODO: why are the arguments not typed?
          res,
        ) => {
          if (jsonRpcError) {
            spinner.fail(
              `Failed to deploy to Graph node ${requestUrl}: ${jsonRpcError.message}`,
            )

            // Provide helpful advice when the subgraph has not been created yet
            if (jsonRpcError.message.match(/subgraph name not found/)) {
              if (isHostedService) {
                print.info(`
You may need to create it at https://thegraph.com/explorer/dashboard.`)
              } else {
                print.info(`
Make sure to create the subgraph first by running the following command:
$ graph create --node ${node} ${subgraphName}`)
              }
            }
            process.exitCode = 1
          } else if (requestError) {
            spinner.fail(`HTTP error deploying the subgraph ${requestError.code}`)
            process.exitCode = 1
          } else {
            spinner.stop()

            const base = requestUrl.protocol + '//' + requestUrl.hostname
            let playground = res.playground
            let queries = res.queries

            // Add a base URL if graph-node did not return the full URL
            if (playground.charAt(0) === ':') {
              playground = base + playground
            }
            if (queries.charAt(0) === ':') {
              queries = base + queries
            }

            if (isHostedService) {
              print.success(
                `Deployed to ${chalk.blue(
                  `https://thegraph.com/explorer/subgraph/${subgraphName}`,
                )}`,
              )
            } else {
              print.success(`Deployed to ${chalk.blue(`${playground}`)}`)
            }
            print.info('\nSubgraph endpoints:')
            print.info(`Queries (HTTP):     ${queries}`)
            print.info(``)
          }
        },
      )
    }

    if (watch) {
      await compiler.watchAndCompile(async ipfsHash => {
        if (ipfsHash !== undefined) {
          await deploySubgraph(ipfsHash)
        }
      })
    } else {
      let result = await compiler.compile()
      if (result === undefined || result === false) {
        // Compilation failed, not deploying.
        process.exitCode = 1
        return
      }
      await deploySubgraph(result)
    }
  },
}
