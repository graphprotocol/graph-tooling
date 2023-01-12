import chalk from 'chalk'
import os from 'os'
import path from 'path'
import { GluegunToolbox } from 'gluegun'
import fs from 'fs'
import * as graphCli from '../cli'
import { getSubgraphBasename, validateSubgraphName } from '../command-helpers/subgraph'
import * as DataSourcesExtractor from '../command-helpers/data-sources'
import { validateStudioNetwork } from '../command-helpers/studio'
import { initNetworksConfig } from '../command-helpers/network'
import { withSpinner } from '../command-helpers/spinner'
import { fixParameters } from '../command-helpers/gluegun'
import { chooseNodeUrl } from '../command-helpers/node'
import { loadAbiFromEtherscan, loadAbiFromBlockScout } from '../command-helpers/abi'
import { generateScaffold, writeScaffold } from '../command-helpers/scaffold'
import { abiEvents } from '../scaffold/schema'
import { validateContract } from '../validation'
import Protocol, { ProtocolName } from '../protocols'
import debug from '../debug'
import EthereumABI from '../protocols/ethereum/abi'
import { ContractCtor } from '../protocols/contract'

const protocolChoices = Array.from(Protocol.availableProtocols().keys())
const availableNetworks = Protocol.availableNetworks()

const DEFAULT_EXAMPLE_SUBGRAPH = 'ethereum/gravatar'

let initDebug = debug('graph-cli:init')

const HELP = `
${chalk.bold('graph init')} [options] [subgraph-name] [directory]

${chalk.dim('Options:')}

      --protocol <${protocolChoices.join('|')}>
      --product <subgraph-studio|hosted-service>
                                 Selects the product for which to initialize
      --studio                   Shortcut for --product subgraph-studio
  -g, --node <node>              Graph node for which to initialize
      --allow-simple-name        Use a subgraph name without a prefix (default: false)
  -h, --help                     Show usage information

${chalk.dim('Choose mode with one of:')}

      --from-contract <contract> Creates a scaffold based on an existing contract
      --from-example [example]   Creates a scaffold based on an example subgraph

${chalk.dim('Options for --from-contract:')}

      --contract-name            Name of the contract (default: Contract)
      --index-events             Index contract events as entities

${chalk.dim.underline('Ethereum:')}

      --abi <path>               Path to the contract ABI (default: download from Etherscan)
      --network <${availableNetworks.get('ethereum')!.join('|')}>
                                 Selects the network the contract is deployed to

${chalk.dim.underline('NEAR:')}

      --network <${availableNetworks.get('near')!.join('|')}>
                                 Selects the network the contract is deployed to

${chalk.dim.underline('Cosmos:')}

      --network <${availableNetworks.get('cosmos')!.join('|')}>
                                 Selects the network the contract is deployed to
`

const processInitForm = async (
  toolbox: GluegunToolbox,
  {
    protocol,
    product,
    studio,
    node,
    abi,
    allowSimpleName,
    directory,
    contract,
    indexEvents,
    fromExample,
    network,
    subgraphName,
    contractName,
  }: {
    protocol: ProtocolName
    product: string
    studio: string
    node: string
    abi: EthereumABI
    allowSimpleName: boolean
    directory: string
    contract: string
    indexEvents: boolean
    fromExample: string | boolean
    network: string
    subgraphName: string
    contractName: string
  },
): Promise<
  | {
      abi: EthereumABI
      protocolInstance: Protocol
      subgraphName: string
      directory: string
      studio: string
      product: string
      network: string
      contract: string
      indexEvents: boolean
      contractName: string
    }
  | undefined
> => {
  let abiFromEtherscan: EthereumABI | undefined = undefined
  let abiFromFile = undefined
  let protocolInstance!: Protocol
  let ProtocolContract: ContractCtor
  let ABI: typeof EthereumABI

  let questions = [
    {
      type: 'select',
      name: 'protocol',
      message: 'Protocol',
      choices: protocolChoices,
      skip: protocolChoices.includes(protocol),
      result: (value: string) => {
        protocol = protocol || value
        protocolInstance = new Protocol(protocol)
        return protocol
      },
    },
    {
      type: 'select',
      name: 'product',
      message: 'Product for which to initialize',
      choices: ['subgraph-studio', 'hosted-service'],
      skip: () =>
        protocol === 'arweave' ||
        protocol === 'cosmos' ||
        protocol === 'near' ||
        product === 'subgraph-studio' ||
        product === 'hosted-service' ||
        studio !== undefined ||
        node !== undefined,
      result: (value: string | undefined) => {
        // For now we only support NEAR subgraphs in the Hosted Service
        if (protocol === 'near') {
          // Can be overwritten because the question will be skipped (product === undefined)
          product = 'hosted-service'
          return product
        }

        if (value == 'subgraph-studio') {
          allowSimpleName = true
        }

        product = value as any
        return value
      },
    },
    {
      type: 'input',
      name: 'subgraphName',
      message: () =>
        product == 'subgraph-studio' || studio ? 'Subgraph slug' : 'Subgraph name',
      initial: subgraphName,
      validate: (name: string) => {
        try {
          validateSubgraphName(name, { allowSimpleName })
          return true
        } catch (e) {
          return `${e.message}

  Examples:

    $ graph init ${os.userInfo().username}/${name}
    $ graph init ${name} --allow-simple-name`
        }
      },
      result: (value: string) => {
        subgraphName = value
        return value
      },
    },
    {
      type: 'input',
      name: 'directory',
      message: 'Directory to create the subgraph in',
      initial: () => directory || getSubgraphBasename(subgraphName),
      validate: (value: string) =>
        toolbox.filesystem.exists(value || directory || getSubgraphBasename(subgraphName))
          ? 'Directory already exists'
          : true,
    },
    {
      type: 'select',
      name: 'network',
      message: () => `${protocolInstance.displayName()} network`,
      choices: () => {
        initDebug(
          'Generating list of available networks for protocol "%s" (%M)',
          protocol,
          availableNetworks.get(protocol as any),
        )
        return (
          // @ts-expect-error TODO: wait what?
          availableNetworks
            .get(protocol) // Get networks related to the chosen protocol.
            // @ts-expect-error TODO: wait what?
            .toArray()
        ) // Needed because of gluegun. It can't even receive a JS iterable.
      },

      skip: fromExample !== undefined,
      initial: network || 'mainnet',
      result: (value: string) => {
        network = value
        return value
      },
    },
    // TODO:
    //
    // protocols that don't support contract
    // - arweave
    // - cosmos
    {
      type: 'input',
      name: 'contract',
      message: () => {
        ProtocolContract = protocolInstance.getContract()!
        return `Contract ${ProtocolContract.identifierName()}`
      },
      skip: () => fromExample !== undefined || !protocolInstance.hasContract(),
      initial: contract,
      validate: async (value: string) => {
        if (fromExample !== undefined || !protocolInstance.hasContract()) {
          return true
        }

        // Validate whether the contract is valid
        const { valid, error } = validateContract(value, ProtocolContract)

        return valid ? true : error
      },
      result: async (value: string) => {
        if (fromExample !== undefined) {
          return value
        }

        ABI = protocolInstance.getABI()

        // Try loading the ABI from Etherscan, if none was provided
        if (protocolInstance.hasABIs() && !abi) {
          try {
            if (network === 'poa-core') {
              // TODO: this variable is never used anywhere, what happens?
              // abiFromBlockScout = await loadAbiFromBlockScout(ABI, network, value)
            } else {
              abiFromEtherscan = await loadAbiFromEtherscan(ABI, network!, value)
            }
          } catch (e) {}
        }
        return value
      },
    },
    {
      type: 'input',
      name: 'abi',
      message: 'ABI file (path)',
      initial: abi,
      skip: () =>
        !protocolInstance.hasABIs() ||
        fromExample !== undefined ||
        abiFromEtherscan !== undefined,
      validate: async (value: string) => {
        if (fromExample || abiFromEtherscan || !protocolInstance.hasABIs()) {
          return true
        }

        try {
          abiFromFile = loadAbiFromFile(toolbox, ABI, value)
          return true
        } catch (e) {
          return e.message
        }
      },
    },
    {
      type: 'input',
      name: 'contractName',
      message: 'Contract Name',
      initial: contractName || 'Contract',
      skip: () => fromExample !== undefined || !protocolInstance.hasContract(),
      validate: (value: string) => value && value.length > 0,
      result: (value: string) => {
        contractName = value
        return value
      },
    },
    {
      type: 'confirm',
      name: 'indexEvents',
      message: 'Index contract events as entities',
      initial: true,
      skip: () => !!indexEvents,
      result: (value: boolean) => {
        indexEvents = value
        return value
      },
    },
  ]

  try {
    let answers = await toolbox.prompt.ask(
      // @ts-expect-error questions do somehow fit
      questions,
    )
    return {
      ...(answers as any), // necessary answers are here
      abi: (abiFromEtherscan || abiFromFile)!,
      protocolInstance,
    }
  } catch (e) {
    return undefined
  }
}

const loadAbiFromFile = (
  toolbox: GluegunToolbox,
  ABI: typeof EthereumABI,
  filename: string,
) => {
  let exists = toolbox.filesystem.exists(filename)

  if (!exists) {
    throw Error('File does not exist.')
  } else if (exists === 'dir') {
    throw Error('Path points to a directory, not a file.')
  } else if (exists === 'other') {
    throw Error('Not sure what this path points to.')
  } else {
    return ABI.load('Contract', filename)
  }
}

export default {
  description: 'Creates a new subgraph with basic scaffolding',
  run: async (toolbox: GluegunToolbox) => {
    // Obtain tools
    const { print, system } = toolbox

    // Read CLI parameters
    let {
      protocol,
      product,
      studio,
      node,
      g,
      abi,
      allowSimpleName,
      fromContract,
      contractName,
      fromExample,
      h,
      help,
      indexEvents,
      network,
    } = toolbox.parameters.options

    node = node || g
    ;({ node, allowSimpleName } = chooseNodeUrl({
      product,
      studio,
      node,
      allowSimpleName,
    }))

    if (fromContract && fromExample) {
      print.error(`Only one of --from-example and --from-contract can be used at a time.`)
      process.exitCode = 1
      return
    }

    let subgraphName, directory
    try {
      ;[subgraphName, directory] = fixParameters(toolbox.parameters, {
        allowSimpleName,
        help,
        h,
        indexEvents,
        studio,
      })
    } catch (e) {
      print.error(e.message)
      process.exitCode = 1
      return
    }

    // Show help text if requested
    if (help || h) {
      print.info(HELP)
      return
    }

    // Detect git
    let git = system.which('git')
    if (git === null) {
      print.error(
        `Git was not found on your system. Please install 'git' so it is in $PATH.`,
      )
      process.exitCode = 1
      return
    }

    // Detect Yarn and/or NPM
    let yarn = system.which('yarn')
    let npm = system.which('npm')
    if (!yarn && !npm) {
      print.error(
        `Neither Yarn nor NPM were found on your system. Please install one of them.`,
      )
      process.exitCode = 1
      return
    }

    let commands = {
      install: yarn ? 'yarn' : 'npm install',
      codegen: yarn ? 'yarn codegen' : 'npm run codegen',
      deploy: yarn ? 'yarn deploy' : 'npm run deploy',
    }

    // If all parameters are provided from the command-line,
    // go straight to creating the subgraph from the example
    if (fromExample && subgraphName && directory) {
      return await initSubgraphFromExample(
        toolbox,
        { fromExample, allowSimpleName, directory, subgraphName, studio, product },
        { commands },
      )
    }

    // If all parameters are provided from the command-line,
    // go straight to creating the subgraph from an existing contract
    if (fromContract && protocol && subgraphName && directory && network && node) {
      if (!protocolChoices.includes(protocol)) {
        print.error(
          `Protocol '${protocol}' is not supported, choose from these options: ${protocolChoices.join(
            ', ',
          )}`,
        )
        process.exitCode = 1
        return
      }

      const protocolInstance = new Protocol(protocol)

      if (protocolInstance.hasABIs()) {
        const ABI = protocolInstance.getABI()
        if (abi) {
          try {
            abi = loadAbiFromFile(toolbox, ABI, abi)
          } catch (e) {
            print.error(`Failed to load ABI: ${e.message}`)
            process.exitCode = 1
            return
          }
        } else {
          try {
            if (network === 'poa-core') {
              abi = await loadAbiFromBlockScout(ABI, network, fromContract)
            } else {
              abi = await loadAbiFromEtherscan(ABI, network, fromContract)
            }
          } catch (e) {
            process.exitCode = 1
            return
          }
        }
      }

      return await initSubgraphFromContract(
        toolbox,
        {
          protocolInstance,
          abi,
          allowSimpleName,
          directory,
          contract: fromContract,
          indexEvents,
          network,
          subgraphName,
          contractName,
          node,
          studio,
          product,
        },
        { commands, addContract: false },
      )
    }

    // Otherwise, take the user through the interactive form
    let inputs = await processInitForm(toolbox, {
      protocol,
      product,
      studio,
      node,
      abi,
      allowSimpleName,
      directory,
      contract: fromContract,
      indexEvents,
      fromExample,
      network,
      subgraphName,
      contractName,
    })

    // Exit immediately when the form is cancelled
    if (inputs === undefined) {
      process.exit(1)
    }

    print.info('———')

    if (fromExample) {
      await initSubgraphFromExample(
        toolbox,
        {
          fromExample: fromExample,
          subgraphName: inputs.subgraphName,
          directory: inputs.directory,
          studio: inputs.studio,
          product: inputs.product,
        },
        { commands },
      )
    } else {
      ;({ node, allowSimpleName } = chooseNodeUrl({
        product: inputs.product,
        studio,
        node,
        allowSimpleName,
      }))
      await initSubgraphFromContract(
        toolbox,
        {
          protocolInstance: inputs.protocolInstance,
          allowSimpleName,
          subgraphName: inputs.subgraphName,
          directory: inputs.directory,
          abi: inputs.abi,
          network: inputs.network,
          contract: inputs.contract,
          indexEvents: inputs.indexEvents,
          contractName: inputs.contractName,
          node,
          studio: inputs.studio,
          product: inputs.product,
        },
        { commands, addContract: true },
      )
    }
  },
}

const revalidateSubgraphName = async (
  toolbox: GluegunToolbox,
  subgraphName: string,
  { allowSimpleName }: { allowSimpleName: boolean },
) => {
  // Fail if the subgraph name is invalid
  try {
    validateSubgraphName(subgraphName, { allowSimpleName })
    return true
  } catch (e) {
    toolbox.print.error(`${e.message}

  Examples:

    $ graph init ${os.userInfo().username}/${subgraphName}
    $ graph init ${subgraphName} --allow-simple-name`)
    return false
  }
}

const initRepository = async (toolbox: GluegunToolbox, directory: string) =>
  await withSpinner(
    `Initialize subgraph repository`,
    `Failed to initialize subgraph repository`,
    `Warnings while initializing subgraph repository`,
    async () => {
      // Remove .git dir in --from-example mode; in --from-contract, we're
      // starting from an empty directory
      let gitDir = path.join(directory, '.git')
      if (toolbox.filesystem.exists(gitDir)) {
        toolbox.filesystem.remove(gitDir)
      }
      await toolbox.system.run('git init', { cwd: directory })
      await toolbox.system.run('git add --all', { cwd: directory })
      await toolbox.system.run('git commit -m "Initial commit"', {
        cwd: directory,
      })
      return true
    },
  )

// Only used for local testing / continuous integration.
//
// This requires that the command `npm link` is called
// on the root directory of this repository, as described here:
// https://docs.npmjs.com/cli/v7/commands/npm-link.
const npmLinkToLocalCli = async (toolbox: GluegunToolbox, directory: string) => {
  if (process.env.GRAPH_CLI_TESTS) {
    await toolbox.system.run('npm link @graphprotocol/graph-cli', { cwd: directory })
  }
}

const installDependencies = async (
  toolbox: GluegunToolbox,
  directory: string,
  installCommand: string,
) =>
  await withSpinner(
    `Install dependencies with ${toolbox.print.colors.muted(installCommand)}`,
    `Failed to install dependencies`,
    `Warnings while installing dependencies`,
    async () => {
      // Links to local graph-cli if we're running the automated tests
      await npmLinkToLocalCli(toolbox, directory)

      await toolbox.system.run(installCommand, { cwd: directory })
      return true
    },
  )

const runCodegen = async (
  toolbox: GluegunToolbox,
  directory: string,
  codegenCommand: string,
) =>
  await withSpinner(
    `Generate ABI and schema types with ${toolbox.print.colors.muted(codegenCommand)}`,
    `Failed to generate code from ABI and GraphQL schema`,
    `Warnings while generating code from ABI and GraphQL schema`,
    async () => {
      await toolbox.system.run(codegenCommand, { cwd: directory })
      return true
    },
  )

const printNextSteps = (
  toolbox: GluegunToolbox,
  { subgraphName, directory }: { subgraphName: string; directory: string },
  {
    commands,
  }: {
    commands: {
      install: string
      codegen: string
      deploy: string
    }
  },
) => {
  const { print } = toolbox

  let relativeDir = path.relative(process.cwd(), directory)

  // Print instructions
  print.success(
    `
Subgraph ${print.colors.blue(subgraphName)} created in ${print.colors.blue(relativeDir)}
`,
  )
  print.info(`Next steps:

  1. Run \`${print.colors.muted('graph auth')}\` to authenticate with your deploy key.

  2. Type \`${print.colors.muted(`cd ${relativeDir}`)}\` to enter the subgraph.

  3. Run \`${print.colors.muted(commands.deploy)}\` to deploy the subgraph.

Make sure to visit the documentation on https://thegraph.com/docs/ for further information.`)
}

const initSubgraphFromExample = async (
  toolbox: GluegunToolbox,
  {
    fromExample,
    allowSimpleName,
    subgraphName,
    directory,
    studio,
    product,
  }: {
    fromExample: string | boolean
    allowSimpleName?: boolean
    subgraphName: string
    directory: string
    studio: string
    product: string
  },
  {
    commands,
  }: {
    commands: {
      install: string
      codegen: string
      deploy: string
    }
  },
) => {
  let { filesystem, print, system } = toolbox

  // Fail if the subgraph name is invalid
  if (
    !revalidateSubgraphName(toolbox, subgraphName, { allowSimpleName: !!allowSimpleName })
  ) {
    process.exitCode = 1
    return
  }

  // Fail if the output directory already exists
  if (filesystem.exists(directory)) {
    print.error(`Directory or file "${directory}" already exists`)
    process.exitCode = 1
    return
  }

  // Clone the example subgraph repository
  let cloned = await withSpinner(
    `Cloning example subgraph`,
    `Failed to clone example subgraph`,
    `Warnings while cloning example subgraph`,
    async () => {
      // Create a temporary directory
      const prefix = path.join(os.tmpdir(), 'example-subgraph-')
      const tmpDir = fs.mkdtempSync(prefix)

      try {
        await system.run(
          `git clone http://github.com/graphprotocol/example-subgraphs ${tmpDir}`,
        )

        // If an example is not specified, use the default one
        if (fromExample === undefined || fromExample === true) {
          fromExample = DEFAULT_EXAMPLE_SUBGRAPH
        }

        const exampleSubgraphPath = path.join(tmpDir, String(fromExample))

        if (!filesystem.exists(exampleSubgraphPath)) {
          return { result: false, error: `Example not found: ${fromExample}` }
        }

        filesystem.copy(exampleSubgraphPath, directory)
        return true
      } finally {
        filesystem.remove(tmpDir)
      }
    },
  )
  if (!cloned) {
    process.exitCode = 1
    return
  }

  try {
    // It doesn't matter if we changed the URL we clone the YAML,
    // we'll check it's network anyway. If it's a studio subgraph we're dealing with.
    const dataSourcesAndTemplates = await DataSourcesExtractor.fromFilePath(
      path.join(directory, 'subgraph.yaml'),
    )

    for (const { network } of dataSourcesAndTemplates) {
      validateStudioNetwork({ studio, product, network })
    }
  } catch (e) {
    print.error(e.message)
    process.exitCode = 1
    return
  }

  let networkConf = await initNetworksConfig(toolbox, directory, 'address')
  if (networkConf !== true) {
    process.exitCode = 1
    return
  }

  // Update package.json to match the subgraph name
  let prepared = await withSpinner(
    `Update subgraph name and commands in package.json`,
    `Failed to update subgraph name and commands in package.json`,
    `Warnings while updating subgraph name and commands in package.json`,
    async () => {
      try {
        // Load package.json
        let pkgJsonFilename = filesystem.path(directory, 'package.json')
        let pkgJson = await filesystem.read(pkgJsonFilename, 'json')

        pkgJson.name = getSubgraphBasename(subgraphName)
        Object.keys(pkgJson.scripts).forEach(name => {
          pkgJson.scripts[name] = pkgJson.scripts[name].replace('example', subgraphName)
        })
        delete pkgJson['license']
        delete pkgJson['repository']

        // Remove example's cli in favor of the local one (added via `npm link`)
        if (process.env.GRAPH_CLI_TESTS) {
          delete pkgJson['devDependencies']['@graphprotocol/graph-cli']
        }

        // Write package.json
        filesystem.write(pkgJsonFilename, pkgJson, { jsonIndent: 2 })
        return true
      } catch (e) {
        print.error(`Failed to preconfigure the subgraph: ${e}`)
        filesystem.remove(directory)
        return false
      }
    },
  )
  if (!prepared) {
    process.exitCode = 1
    return
  }

  // Initialize a fresh Git repository
  let repo = await initRepository(toolbox, directory)
  if (repo !== true) {
    process.exitCode = 1
    return
  }

  // Install dependencies
  let installed = await installDependencies(toolbox, directory, commands.install)
  if (installed !== true) {
    process.exitCode = 1
    return
  }

  // Run code-generation
  let codegen = await runCodegen(toolbox, directory, commands.codegen)
  if (codegen !== true) {
    process.exitCode = 1
    return
  }

  printNextSteps(toolbox, { subgraphName, directory }, { commands })
}

const initSubgraphFromContract = async (
  toolbox: GluegunToolbox,
  {
    protocolInstance,
    allowSimpleName,
    subgraphName,
    directory,
    abi,
    network,
    contract,
    indexEvents,
    contractName,
    node,
    studio,
    product,
  }: {
    protocolInstance: Protocol
    allowSimpleName: boolean
    subgraphName: string
    directory: string
    abi: EthereumABI
    network: string
    contract: string
    indexEvents: boolean
    contractName: string
    node: string
    studio: string
    product: string
  },
  {
    commands,
    addContract,
  }: {
    commands: {
      install: string
      codegen: string
      deploy: string
    }
    addContract: boolean
  },
) => {
  let { print } = toolbox

  // Fail if the subgraph name is invalid
  if (!revalidateSubgraphName(toolbox, subgraphName, { allowSimpleName })) {
    process.exitCode = 1
    return
  }

  // Fail if the output directory already exists
  if (toolbox.filesystem.exists(directory)) {
    print.error(`Directory or file "${directory}" already exists`)
    process.exitCode = 1
    return
  }

  if (
    protocolInstance.hasABIs() &&
    (abiEvents(abi).size === 0 ||
      // @ts-expect-error TODO: the abiEvents result is expected to be a List, how's it an array?
      abiEvents(abi).length === 0)
  ) {
    // Fail if the ABI does not contain any events
    print.error(`ABI does not contain any events`)
    process.exitCode = 1
    return
  }

  // We can validate this before the scaffold because we receive
  // the network from the form or via command line argument.
  // We don't need to read the manifest in this case.
  try {
    validateStudioNetwork({ studio, product, network })
  } catch (e) {
    print.error(e.message)
    process.exitCode = 1
    return
  }

  // Scaffold subgraph
  let scaffold = await withSpinner(
    `Create subgraph scaffold`,
    `Failed to create subgraph scaffold`,
    `Warnings while creating subgraph scaffold`,
    async spinner => {
      let scaffold = await generateScaffold(
        {
          protocolInstance,
          subgraphName,
          abi,
          network,
          contract,
          indexEvents,
          contractName,
          node,
        },
        spinner,
      )
      await writeScaffold(scaffold, directory, spinner)
      return true
    },
  )
  if (scaffold !== true) {
    process.exitCode = 1
    return
  }

  if (protocolInstance.hasContract()) {
    let identifierName = protocolInstance.getContract()!.identifierName()
    let networkConf = await initNetworksConfig(toolbox, directory, identifierName)
    if (networkConf !== true) {
      process.exitCode = 1
      return
    }
  }

  // Initialize a fresh Git repository
  let repo = await initRepository(toolbox, directory)
  if (repo !== true) {
    process.exitCode = 1
    return
  }

  // Install dependencies
  let installed = await installDependencies(toolbox, directory, commands.install)
  if (installed !== true) {
    process.exitCode = 1
    return
  }

  // Run code-generation
  let codegen = await runCodegen(toolbox, directory, commands.codegen)
  if (codegen !== true) {
    process.exitCode = 1
    return
  }

  while (addContract) {
    addContract = await addAnotherContract(toolbox, { protocolInstance, directory })
  }

  printNextSteps(toolbox, { subgraphName, directory }, { commands })
}

const addAnotherContract = async (
  toolbox: GluegunToolbox,
  { protocolInstance, directory }: { protocolInstance: Protocol; directory: string },
) => {
  const addContractConfirmation = await toolbox.prompt.confirm('Add another contract?')

  if (addContractConfirmation) {
    let abiFromFile: boolean = false
    let ProtocolContract = protocolInstance.getContract()!

    let questions = [
      {
        type: 'input',
        name: 'contract',
        message: () => `Contract ${ProtocolContract.identifierName()}`,
        validate: async (value: string) => {
          // Validate whether the contract is valid
          const { valid, error } = validateContract(value, ProtocolContract)
          return valid ? true : error
        },
      },
      {
        type: 'select',
        name: 'localAbi',
        message: 'Provide local ABI path?',
        choices: ['yes', 'no'],
        result: (value: string) => {
          abiFromFile = value === 'yes' ? true : false
          return abiFromFile
        },
      },
      {
        type: 'input',
        name: 'abi',
        message: 'ABI file (path)',
        skip: () => abiFromFile === false,
      },
      {
        type: 'input',
        name: 'contractName',
        message: 'Contract Name',
        initial: 'Contract',
        validate: (value: string) => value && value.length > 0,
      },
    ]

    // Get the cwd before process.chdir in order to switch back in the end of command execution
    const cwd = process.cwd()

    try {
      let { abi, contract, contractName } = await toolbox.prompt.ask(
        // @ts-expect-error questions do somehow fit
        questions,
      )

      if (fs.existsSync(directory)) {
        process.chdir(directory)
      }

      let commandLine = ['add', contract, '--contract-name', contractName]

      if (abiFromFile) {
        if (abi.includes(directory)) {
          commandLine.push('--abi', path.normalize(abi.replace(directory, '')))
        } else {
          commandLine.push('--abi', abi)
        }
      }

      await graphCli.run(commandLine)
    } catch (e) {
      toolbox.print.error(e)
      process.exit(1)
    } finally {
      process.chdir(cwd)
    }
  }

  return addContractConfirmation
}
