const chalk = require('chalk')
const fetch = require('node-fetch')
const os = require('os')
const path = require('path')
const toolbox = require('gluegun/toolbox')
const {
  getSubgraphBasename,
  validateSubgraphName,
} = require('../command-helpers/subgraph')
const { withSpinner, step } = require('../command-helpers/spinner')
const { generateScaffold, writeScaffold } = require('../scaffold')

const HELP = `
${chalk.bold('graph init')} [options] ${chalk.bold('<subgraph-name>')}

${chalk.dim('Options:')}

  -h, --help                    Show usage information
      --allow-simple-name       Use a subgraph name without a prefix (default: false)
`

const processInitForm = async (toolbox, subgraphName, { allowSimpleName }) => {
  let useEtherscan = true
  let questions = [
    {
      type: 'input',
      name: 'subgraphName',
      message: 'Subgraph name',
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
      initial: () => getSubgraphBasename(subgraphName),
      validate: value =>
        toolbox.filesystem.exists(value) ? 'Directory already exists' : true,
    },
    {
      type: 'select',
      name: 'network',
      message: 'Ethereum network',
      choices: ['mainnet', 'kovan', 'rinkeby', 'ropsten'],
      initial: 'mainnet',
    },
    {
      type: 'input',
      name: 'address',
      message: 'Contract address',
      validate: value => {
        // Validate whether the address is valid
        let pattern = /^(0x)?[0-9a-fA-F]{40}$/
        if (pattern.test(value)) {
          return true
        } else {
          return `Contract address "${value}" is invalid.
  Must be 40 hexadecimal characters, with an optional '0x' prefix.`
        }
      },
    },
    {
      type: 'confirm',
      name: 'useEtherscan',
      message: 'Fetch ABI from Etherscan?',
      initial: useEtherscan,
      result: value => {
        useEtherscan = value
        return value
      },
    },
    {
      type: 'input',
      name: 'abiFile',
      message: 'ABI file (path)',
      skip: () => useEtherscan,
      validate: value =>
        toolbox.filesystem.exists(value) ? true : 'File does not exist',
    },
  ]

  try {
    return await toolbox.prompt.ask(questions)
  } catch (e) {
    return undefined
  }
}

const loadAbiFromEtherscan = async (network, address) => {
  let result = await fetch(
    `https://${
      network === 'mainnet' ? 'api' : `api-${network}`
    }.etherscan.io/api?module=contract&action=getabi&address=${address}`
  )
  let json = await result.json()
  return JSON.parse(json.result)
}

const loadAbiFromFile = async file => await toolbox.filesystem.read(abiFile, 'json')

const loadAbi = async ({ abiFile, address, network, useEtherscan }) => {
  if (useEtherscan) {
    return await loadAbiFromEtherscan(network, address)
  } else {
    return await loadAbiFromFile(abiFile)
  }
}

module.exports = {
  description: 'Creates a new subgraph with basic scaffolding',
  run: async toolbox => {
    // Obtain tools
    let { filesystem, print, system } = toolbox

    // Read CLI parameters
    let { allowSimpleName, h, help } = toolbox.parameters.options
    let subgraphName = toolbox.parameters.first

    // Show help text if requested
    if (h || help) {
      print.info(HELP)
      return
    }

    // Detect git
    let git = await system.which('git')
    if (git === null) {
      print.error(
        `Git was not found on your system. Please install 'git' so it is in $PATH.`
      )
      process.exitCode = 1
      return
    }

    // Detect Yarn and/or NPM
    let yarn = await system.which('yarn')
    let npm = await system.which('npm')
    if (!yarn && !npm) {
      print.error(
        `Neither Yarn nor NPM were found on your system. Please install one of them.`
      )
      process.exitCode = 1
      return
    }

    // Collect user input
    let inputs = await processInitForm(toolbox, subgraphName, { allowSimpleName })
    if (inputs === undefined) {
      process.exit(1)
      return
    }

    print.info('———')

    // Extract user input
    subgraphName = inputs.subgraphName
    let { abiFile, address, directory, network, useEtherscan } = inputs

    let installCommand = yarn ? 'yarn' : 'npm install'
    let codegenCommand = yarn ? 'yarn codegen' : 'npm run codegen'
    let deployCommand = yarn ? 'yarn deploy' : 'npm run deploy'

    // Obtain the ABI from the network-specific Etherscan or from the local file
    let abi = await withSpinner(
      `Load ABI from ${useEtherscan ? 'Etherscan' : abiFile}`,
      `Failed to load ABI from ${useEtherscan ? 'Etherscan' : abiFile}`,
      async spinner => {
        return await loadAbi({ abiFile, address, network, useEtherscan })
      }
    )
    if (abi === undefined) {
      process.exitCode = 1
      return
    }

    // Fail if the ABI does not contain any events
    if (abi.filter(item => item.type === 'event').length === 0) {
      print.error(`ABI does not contain any events`)
      process.exitCode = 1
      return
    }

    // Fail if the output directory already exists
    if (toolbox.filesystem.exists(directory)) {
      print.error(`Directory or file "${directory}" already exists`)
      process.exitCode = 1
      return
    }

    // Scaffold subgraph from ABI
    let scaffold = await withSpinner(
      `Create subgraph scaffold`,
      `Failed to create subgraph scaffold`,
      async spinner => {
        let scaffold = await generateScaffold(
          {
            subgraphName,
            abi,
            network,
            address,
          },
          spinner
        )
        await writeScaffold(scaffold, directory, spinner)
        return true
      }
    )
    if (scaffold !== true) {
      process.exitCode = 1
      return
    }

    // Initialize a git repository
    let repo = await withSpinner(
      `Initialize subgraph repository`,
      `Failed to initialize subgraph repository`,
      async spinner => {
        await system.run('git init', { cwd: directory })
        await system.run('git add --all', { cwd: directory })
        await system.run('git commit -m "Initial commit"', {
          cwd: directory,
        })
        return true
      }
    )
    if (repo !== true) {
      process.exitCode = 1
      return
    }

    // Install dependencies
    let installed = await withSpinner(
      `Install dependencies with ${print.colors.muted(installCommand)}`,
      `Failed to install dependencies`,
      async spinner => {
        await system.run(installCommand, { cwd: directory })
        return true
      }
    )
    if (installed !== true) {
      process.exitCode = 1
      return
    }

    // Run code-generation
    let codegen = await withSpinner(
      `Generate ABI and schema types with ${print.colors.muted(codegenCommand)}`,
      `Failed to generatecode from ABI and GraphQL schema`,
      async spinner => {
        await system.run(codegenCommand, { cwd: directory })
        return true
      }
    )
    if (codegen !== true) {
      process.exitCode = 1
      return
    }

    // Print instructions
    print.success(
      `
Subgraph ${print.colors.blue(subgraphName)} created in ${print.colors.blue(directory)}
`
    )
    print.info(`Next steps:
    
  1. Run \`${print.colors.muted(
    'graph auth https://api.thegraph.com/deploy/ <access-token>'
  )}\`
     to authenticate with the hosted service. You can get the access token from
     https://thegraph.com/explorer/dashboard/.
  
  2. Type \`${print.colors.muted(`cd ${directory}`)}\` to enter the subgraph.
  
  3. Run \`${print.colors.muted(deployCommand)}\` to deploy the subgraph to
     https://thegraph.com/explorer/subgraph/${subgraphName}.

Make sure to visit the documentation on https://thegraph.com/docs/ for further information.`)
  },
}
