const chalk = require('chalk')
const fetch = require('node-fetch')
const immutable = require('immutable')
const os = require('os')
const path = require('path')
const toolbox = require('gluegun/toolbox')

const {
  getSubgraphBasename,
  validateSubgraphName,
} = require('../command-helpers/subgraph')
const { validateStudioNetwork } = require('../command-helpers/studio')
const { withSpinner, step } = require('../command-helpers/spinner')
const { fixParameters } = require('../command-helpers/gluegun')
const { chooseNodeUrl } = require('../command-helpers/node')
const { loadManifest } = require('../migrations/util/load-manifest')
const { abiEvents, generateScaffold, writeScaffold } = require('../scaffold')
const ABI = require('../abi')

const networkChoices = [
  'mainnet',
  'kovan',
  'rinkeby',
  'ropsten',
  'goerli',
  'poa-core',
  'poa-sokol',
  'xdai',
  'matic',
  'mumbai',
  'fantom',
  'bsc',
  'chapel',
  'clover',
  'avalanche',
  'fuji',
  'celo',
  'celo-alfajores',
  'fuse',
  'mbase',
  'arbitrum-one',
  'arbitrum-rinkeby',
  'optimism',
  'optimism-kovan'
]

const HELP = `
${chalk.bold('graph init')} [options] [subgraph-name] [directory]

${chalk.dim('Options:')}

      --product <subgraph-studio|hosted-service>
                                Selects the product for which to initialize
      --studio                  Shortcut for --product subgraph-studio
  -g, --node <node>             Graph node for which to initialize
      --allow-simple-name       Use a subgraph name without a prefix (default: false)
  -h, --help                    Show usage information

${chalk.dim('Choose mode with one of:')}

      --from-contract <address> Creates a scaffold based on an existing contract
      --from-example            Creates a scaffold based on an example subgraph

${chalk.dim('Options for --from-contract:')}

      --abi <path>              Path to the contract ABI (default: download from Etherscan)
      --network <${networkChoices.join('|')}>
                                Selects the network the contract is deployed to
      --index-events            Index contract events as entities
      --contract-name           Name of the contract (default: Contract)      
`

const processInitForm = async (
  toolbox,
  {
    product,
    studio,
    node,
    abi,
    allowSimpleName,
    directory,
    address,
    fromExample,
    network,
    subgraphName,
    contractName
  },
) => {
  let addressPattern = /^(0x)?[0-9a-fA-F]{40}$/

  let abiFromEtherscan = undefined
  let abiFromFile = undefined

  let questions = [
    {
      type: 'select',
      name: 'product',
      message: 'Product for which to initialize',
      choices: ['subgraph-studio', 'hosted-service'],
      skip: 
        product === 'subgraph-studio' ||
        product === 'hosted-service' ||
        studio !== undefined || node !== undefined,
      result: value => {
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
      message: 'Ethereum network',
      choices: networkChoices,
      skip: fromExample !== undefined,
      initial: network || 'mainnet',
      result: value => {
        network = value
        return value
      },
    },
    {
      type: 'input',
      name: 'address',
      message: 'Contract address',
      skip: fromExample !== undefined,
      initial: address,
      validate: async value => {
        if (fromExample !== undefined) {
          return true
        }

        // Validate whether the address is valid
        if (!addressPattern.test(value)) {
          return `Contract address "${value}" is invalid.
  Must be 40 hexadecimal characters, with an optional '0x' prefix.`
        }

        return true
      },
      result: async value => {
        if (fromExample !== undefined) {
          return value
        }

        // Try loading the ABI from Etherscan, if none was provided
        if (!abi) {
          try {
            if (network === 'poa-core') {
              abiFromBlockScout = await loadAbiFromBlockScout(network, value)
            } else {
              abiFromEtherscan = await loadAbiFromEtherscan(network, value)
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
      skip: () => fromExample !== undefined || abiFromEtherscan !== undefined,
      validate: async value => {
        if (fromExample || abiFromEtherscan) {
          return true
        }

        try {
          abiFromFile = await loadAbiFromFile(value)
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
    return { ...answers, abi: abiFromEtherscan || abiFromFile }
  } catch (e) {
    return undefined
  }
}

const loadAbiFromBlockScout = async (network, address) =>
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

const loadAbiFromEtherscan = async (network, address) =>
  await withSpinner(
    `Fetching ABI from Etherscan`,
    `Failed to fetch ABI from Etherscan`,
    `Warnings while fetching ABI from Etherscan`,
    async spinner => {
      let result = await fetch(
        `https://${
          network === 'mainnet' ? 'api' : `api-${network}`
        }.etherscan.io/api?module=contract&action=getabi&address=${address}`,
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

const loadAbiFromFile = async filename => {
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
    if (fromContract && subgraphName && directory && network && node) {
      if (abi) {
        try {
          abi = await loadAbiFromFile(abi)
        } catch (e) {
          print.error(`Failed to load ABI: ${e.message}`)
          process.exitCode = 1
          return
        }
      } else {
        try {
          if (network === 'poa-core') {
            abi = await loadAbiFromBlockScout(network, fromContract)
          } else {
            abi = await loadAbiFromEtherscan(network, fromContract)
          }
        } catch (e) {
          process.exitCode = 1
          return
        }
      }

      return await initSubgraphFromContract(
        toolbox,
        {
          abi,
          allowSimpleName,
          directory,
          address: fromContract,
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
      product,
      studio,
      node,
      abi,
      allowSimpleName,
      directory,
      address: fromContract,
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
          allowSimpleName,
          subgraphName: inputs.subgraphName,
          directory: inputs.directory,
          abi: inputs.abi,
          network: inputs.network,
          address: inputs.address,
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

const installDependencies = async (toolbox, directory, installCommand) =>
  await withSpinner(
    `Install dependencies with ${toolbox.print.colors.muted(installCommand)}`,
    `Failed to install dependencies`,
    `Warnings while installing dependencies`,
    async spinner => {
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
    let manifestFile = await loadManifest(path.join(directory, 'subgraph.yaml'))

    for (const { network } of manifestFile.dataSources || []) {
      validateStudioNetwork({ studio, product, network })
    }

    for (const { network } of manifestFile.templates || []) {
      validateStudioNetwork({ studio, product, network })
    }
  } catch (e) {
    print.error(e.message)
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
    allowSimpleName,
    subgraphName,
    directory,
    abi,
    network,
    address,
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

  if (abiEvents(abi).length === 0) {
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

  // Scaffold subgraph from ABI
  let scaffold = await withSpinner(
    `Create subgraph scaffold`,
    `Failed to create subgraph scaffold`,
    `Warnings while creating subgraph scaffold`,
    async spinner => {
      let scaffold = await generateScaffold(
        {
          subgraphName,
          abi,
          network,
          address,
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
