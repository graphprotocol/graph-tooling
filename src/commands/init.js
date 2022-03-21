const chalk = require('chalk')
const fetch = require('node-fetch')
const immutable = require('immutable')
const os = require('os')
const path = require('path')
const toolbox = require('gluegun/toolbox')
const yaml = require('yaml')

const {
  getSubgraphBasename,
  validateSubgraphName,
} = require('../command-helpers/subgraph')
const DataSourcesExtractor = require('../command-helpers/data-sources')
const { validateStudioNetwork } = require('../command-helpers/studio')
const { initNetworksConfig } = require('../command-helpers/network')
const { withSpinner, step } = require('../command-helpers/spinner')
const { fixParameters } = require('../command-helpers/gluegun')
const { chooseNodeUrl } = require('../command-helpers/node')
const { generateScaffold, writeScaffold } = require('../command-helpers/scaffold')
const { abiEvents } = require('../scaffold/schema')
const { validateContract } = require('../validation')
const Protocol = require('../protocols')

const protocolChoices = Array.from(Protocol.availableProtocols().keys())
const availableNetworks = Protocol.availableNetworks()

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
      --from-example             Creates a scaffold based on an example subgraph

${chalk.dim('Options for --from-contract:')}

      --contract-name            Name of the contract (default: Contract)
      --index-events             Index contract events as entities

${chalk.dim.underline('Ethereum:')}

      --abi <path>               Path to the contract ABI (default: download from Etherscan)
      --network <${availableNetworks.get('ethereum').join('|')}>
                                 Selects the network the contract is deployed to

${chalk.dim.underline('NEAR:')}

      --network <${availableNetworks.get('near').join('|')}>
                                 Selects the network the contract is deployed to
`

const processInitForm = async (
  toolbox,
  {
    protocol,
    product,
    studio,
    node,
    abi,
    allowSimpleName,
    directory,
    contract,
    fromExample,
    network,
    subgraphName,
    contractName
  },
) => {
  let abiFromEtherscan = undefined
  let abiFromFile = undefined
  let protocolInstance
  let ProtocolContract
  let ABI

  let questions = [
    {
      type: 'select',
      name: 'protocol',
      message: 'Protocol',
      choices: protocolChoices,
      skip: protocolChoices.includes(protocol),
      result: value => {
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
        protocol === 'near' ||
        product === 'subgraph-studio' ||
        product === 'hosted-service' ||
        studio !== undefined || node !== undefined,
      result: value => {
        // For now we only support NEAR subgraphs in the Hosted Service
        if (protocol === 'near') {
          // Can be overwritten because the question will be skipped (product === undefined)
          product = 'hosted-service'
          return product
        }

        if (value == 'subgraph-studio') {
          allowSimpleName = true
        }

        product = value
        return value
      },
    },
    {
      type: 'input',
      name: 'subgraphName',
      message: () => product == 'subgraph-studio' || studio ? 'Subgraph slug' : 'Subgraph name',
      initial: subgraphName,
      validate: name => {
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
      result: value => {
        subgraphName = value
        return value
      },
    },
    {
      type: 'input',
      name: 'directory',
      message: 'Directory to create the subgraph in',
      initial: () => directory || getSubgraphBasename(subgraphName),
      validate: value =>
        toolbox.filesystem.exists(value || directory || getSubgraphBasename(subgraphName))
          ? 'Directory already exists'
          : true,
    },
    {
      type: 'select',
      name: 'network',
      message: () => `${protocolInstance.displayName()} network`,
      choices: () =>
        availableNetworks
          .get(protocol) // Get networks related to the chosen protocol.
          .toArray(), // Needed because of gluegun. It can't even receive a JS iterable.
      skip: fromExample !== undefined,
      initial: network || 'mainnet',
      result: value => {
        network = value
        return value
      },
    },
    {
      type: 'input',
      name: 'contract',
      message: () => {
        ProtocolContract = protocolInstance.getContract()
        return `Contract ${ProtocolContract.identifierName()}`
      },
      skip: fromExample !== undefined,
      initial: contract,
      validate: async value => {
        if (fromExample !== undefined) {
          return true
        }

        // Validate whether the contract is valid
        const { valid, error } = validateContract(value, ProtocolContract)

        return valid
          ? true
          : error
      },
      result: async value => {
        if (fromExample !== undefined) {
          return value
        }

        ABI = protocolInstance.getABI()

        // Try loading the ABI from Etherscan, if none was provided
        if (protocolInstance.hasABIs() && !abi) {
          try {
            if (network === 'poa-core') {
              abiFromBlockScout = await loadAbiFromBlockScout(ABI, network, value)
            } else {
              abiFromEtherscan = await loadAbiFromEtherscan(ABI, network, value)
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
      validate: async value => {
        if (fromExample || abiFromEtherscan || !protocolInstance.hasABIs()) {
          return true
        }

        try {
          abiFromFile = await loadAbiFromFile(ABI, value)
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
      skip: () => fromExample !== undefined,
      validate: value => value && value.length > 0,
      result: value => {
        contractName = value;
        return value;
      }
    },
  ]

  try {
    let answers = await toolbox.prompt.ask(questions)
    return { ...answers, abi: abiFromEtherscan || abiFromFile, protocolInstance }
  } catch (e) {
    return undefined
  }
}

const loadAbiFromBlockScout = async (ABI, network, address) =>
  await withSpinner(
    `Fetching ABI from BlockScout`,
    `Failed to fetch ABI from BlockScout`,
    `Warnings while fetching ABI from BlockScout`,
    async spinner => {
      let result = await fetch(
        `https://blockscout.com/${
          network.replace('-', '/')
        }/api?module=contract&action=getabi&address=${address}`,
      )
      let json = await result.json()

      // BlockScout returns a JSON object that has a `status`, a `message` and
      // a `result` field. The `status` is '0' in case of errors and '1' in
      // case of success
      if (json.status === '1') {
        return new ABI('Contract', undefined, immutable.fromJS(JSON.parse(json.result)))
      } else {
        throw new Error('ABI not found, try loading it from a local file')
      }
    },
  )

const getEtherscanLikeAPIUrl = (network) => {
  switch(network){
    case "mainnet": return `https://api.etherscan.io/api`;
    case "arbitrum-one": return `https://api.arbiscan.io/api`;
    case "bsc": return `https://api.bscscan.com/api`;
    case "matic": return `https://api.polygonscan.com/api`;
    case "mumbai": return `https://api-testnet.polygonscan.com/api`;
    case "aurora": return `https://api.aurorascan.dev/api`;
    case "aurora-testnet": return `https://api-testnet.aurorascan.dev/api`;
    case "optimism-kovan": return `https://api-kovan-optimistic.etherscan.io/api`;
    default: return `https://api-${network}.etherscan.io/api`;
  }
}

const loadAbiFromEtherscan = async (ABI, network, address) =>
  await withSpinner(
    `Fetching ABI from Etherscan`,
    `Failed to fetch ABI from Etherscan`,
    `Warnings while fetching ABI from Etherscan`,
    async spinner => {
      const scanApiUrl = getEtherscanLikeAPIUrl(network);
      let result = await fetch(
        `${scanApiUrl}?module=contract&action=getabi&address=${address}`,
      )
      let json = await result.json()

      // Etherscan returns a JSON object that has a `status`, a `message` and
      // a `result` field. The `status` is '0' in case of errors and '1' in
      // case of success
      if (json.status === '1') {
        return new ABI('Contract', undefined, immutable.fromJS(JSON.parse(json.result)))
      } else {
        throw new Error('ABI not found, try loading it from a local file')
      }
    },
  )

const loadAbiFromFile = async (ABI, filename) => {
  let exists = await toolbox.filesystem.exists(filename)

  if (!exists) {
    throw Error('File does not exist.')
  } else if (exists === 'dir') {
    throw Error('Path points to a directory, not a file.')
  } else if (exists === 'other') {
    throw Error('Not sure what this path points to.')
  } else {
    return await ABI.load('Contract', filename)
  }
}

module.exports = {
  description: 'Creates a new subgraph with basic scaffolding',
  options: {
    boolean: ['from-example'],
  },
  run: async toolbox => {
    // Obtain tools
    let { print, system } = toolbox

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
    ;({ node, allowSimpleName } = chooseNodeUrl({ product, studio, node, allowSimpleName }))

    if (fromContract && fromExample) {
      print.error(`Only one of --from-example and --from-contract can be used at a time.`)
      process.exitCode = 1
      return
    }

    let subgraphName, directory
    try {
      ;[subgraphName, directory] = fixParameters(toolbox.parameters, {
        fromExample,
        allowSimpleName,
        help,
        h,
        indexEvents,
        studio
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
    let git = await system.which('git')
    if (git === null) {
      print.error(
        `Git was not found on your system. Please install 'git' so it is in $PATH.`,
      )
      process.exitCode = 1
      return
    }

    // Detect Yarn and/or NPM
    let yarn = await system.which('yarn')
    let npm = await system.which('npm')
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
        { allowSimpleName, directory, subgraphName, studio, product },
        { commands },
      )
    }

    // If all parameters are provided from the command-line,
    // go straight to creating the subgraph from an existing contract
    if (fromContract && protocol && subgraphName && directory && network && node) {
      if (!protocolChoices.includes(protocol)) {
        print.error(`Protocol '${protocol}' is not supported, choose from these options: ${protocolChoices.join(', ')}`)
        process.exitCode = 1
        return
      }

      const protocolInstance = new Protocol(protocol)

      if (protocolInstance.hasABIs()) {
        const ABI = protocolInstance.getABI()
        if (abi) {
          try {
            abi = await loadAbiFromFile(ABI, abi)
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
        { commands },
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
      fromExample,
      network,
      subgraphName,
      contractName
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
        allowSimpleName
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
          indexEvents,
          contractName: inputs.contractName,
          node,
          studio: inputs.studio,
          product: inputs.product,
        },
        { commands },
      )
    }
  },
}

const revalidateSubgraphName = async (toolbox, subgraphName, { allowSimpleName }) => {
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

const initRepository = async (toolbox, directory) =>
  await withSpinner(
    `Initialize subgraph repository`,
    `Failed to initialize subgraph repository`,
    `Warnings while initializing subgraph repository`,
    async spinner => {
      // Remove .git dir in --from-example mode; in --from-contract, we're
      // starting from an empty directory
      let gitDir = path.join(directory, '.git')
      if (toolbox.filesystem.exists(gitDir)) {
        await toolbox.filesystem.remove(gitDir)
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
const npmLinkToLocalCli = async (toolbox, directory) => {
  if (process.env.GRAPH_CLI_TESTS) {
    await toolbox.system.run('npm link @graphprotocol/graph-cli', { cwd: directory })
  }
}

const installDependencies = async (toolbox, directory, installCommand) =>
  await withSpinner(
    `Install dependencies with ${toolbox.print.colors.muted(installCommand)}`,
    `Failed to install dependencies`,
    `Warnings while installing dependencies`,
    async spinner => {
      // Links to local graph-cli if we're running the automated tests
      await npmLinkToLocalCli(toolbox, directory)

      await toolbox.system.run(installCommand, { cwd: directory })
      return true
    },
  )

const runCodegen = async (toolbox, directory, codegenCommand) =>
  await withSpinner(
    `Generate ABI and schema types with ${toolbox.print.colors.muted(codegenCommand)}`,
    `Failed to generate code from ABI and GraphQL schema`,
    `Warnings while generating code from ABI and GraphQL schema`,
    async spinner => {
      await toolbox.system.run(codegenCommand, { cwd: directory })
      return true
    },
  )

const printNextSteps = (toolbox, { subgraphName, directory }, { commands }) => {
  let { print } = toolbox

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
  toolbox,
  { allowSimpleName, subgraphName, directory, studio, product },
  { commands },
) => {
  let { filesystem, print, system } = toolbox

  // Fail if the subgraph name is invalid
  if (!revalidateSubgraphName(toolbox, subgraphName, { allowSimpleName })) {
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
    async spinner => {
      await system.run(
        `git clone http://github.com/graphprotocol/example-subgraph ${directory}`,
      )
      return true
    },
  )
  if (!cloned) {
    process.exitCode = 1
    return
  }

  try {
    // It doesn't matter if we changed the URL we clone the YAML,
    // we'll check it's network anyway. If it's a studio subgraph we're dealing with.
    const dataSourcesAndTemplates = await DataSourcesExtractor.fromFilePath(path.join(directory, 'subgraph.yaml'))

    for (const { network } of dataSourcesAndTemplates) {
      validateStudioNetwork({ studio, product, network })
    }
  } catch (e) {
    print.error(e.message)
    process.exitCode = 1
    return
  }

  let networkConf = await initNetworksConfig(toolbox, directory, "address")
  if (networkConf !== true) {
    process.exitCode = 1
    return
  }

  // Update package.json to match the subgraph name
  let prepared = await withSpinner(
    `Update subgraph name and commands in package.json`,
    `Failed to update subgraph name and commands in package.json`,
    `Warnings while updating subgraph name and commands in package.json`,
    async spinner => {
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
        await filesystem.write(pkgJsonFilename, pkgJson, { jsonIndent: 2 })
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
  toolbox,
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
  },
  { commands },
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

  if (protocolInstance.hasABIs() && abiEvents(abi).length === 0) {
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

  let identifierName = protocolInstance.getContract().identifierName()
  let networkConf = await initNetworksConfig(toolbox, directory, identifierName)
  if (networkConf !== true) {
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
