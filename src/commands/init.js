const chalk = require('chalk')
const os = require('os')
const path = require('path')

const HELP = `
${chalk.bold('graph init')} [options] ${chalk.bold('<subgraph-name>')}

${chalk.dim('Options:')}

  -h, --help                Show usage information
      --allow-simple-name   Use a subgraph name without a prefix component (default: false)
`

const validateSubgraphName = (name, { allowSimpleName }) => {
  if (allowSimpleName) {
    return name
  } else {
    if (name.split('/').length !== 2) {
      throw new Error(`Subgraph name "${name}" needs to have the format "<PREFIX>/${name}".
When using the Hosted Service at https://thegraph.com, <PREFIX> is the
name of your GitHub user or organization.

You can bypass this check with --allow-simple-name.`)
    }
  }
}

const getSubgraphBasename = name => {
  let segments = name.split('/', 2)
  return segments[segments.length - 1]
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

    // Validate the subgraph name
    try {
      validateSubgraphName(subgraphName, { allowSimpleName })
    } catch (e) {
      print.error(e.message)
      print.info(`
Examples:

  $ graph init ${os.userInfo().username}/${subgraphName}
  $ graph init ${subgraphName} --allow-simple-name`)
      process.exitCode = 1
      return
    }

    // Use the subgraph name as the directory name
    let directory = getSubgraphBasename(subgraphName)
    let relativeDirectory = path.relative(process.cwd(), directory)

    // Fail if the output directory alread exists
    if (toolbox.filesystem.exists(directory)) {
      print.error(`Directory or file "${directory}" already exists`)
      process.exitCode = 1
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

    let installCommand = yarn ? 'yarn' : 'npm install'
    let codegenCommand = yarn ? 'yarn codegen' : 'npm run codegen'
    let deployCommand = yarn ? 'yarn deploy' : 'npm run deploy'

    // Clone the example subgraph repository
    try {
      await system.run(
        `git clone http://github.com/graphprotocol/example-subgraph ${directory}`
      )
    } catch (e) {
      print.error(`Failed to clone example subgraph repository: ${e}`)
      process.exitCode = 1
      return
    }

    // Update package.json to match the subgraph name
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
    } catch (e) {
      print.error(`Failed to preconfigure the subgraph: ${e}`)
      process.exitCode = 1
      filesystem.remove(directory)
      return
    }

    // Reset the git repository
    try {
      await filesystem.remove(filesystem.path(directory, '.git'))
      await system.run('git init', { cwd: directory })
      await system.run('git add --all', { cwd: directory })
      await system.run('git commit -m "Initial commit"', {
        cwd: directory,
      })
    } catch (e) {
      print.error(
        `Failed to initialize the subgraph directory ${relativeDirectory}: ${e}`
      )
      process.exitCode = 1
      filesystem.remove(directory)
      return
    }

    print.success(`Subgraph "${subgraphName}" created in ${relativeDirectory}/.`)
    print.info(`
Next steps:
    
  1. Run \`graph auth https://api.thegraph.com/deploy/ <your access token>\`
     to authenticate with the hosted service. You can get the access token from
     https://thegraph.com/explorer/dashboard/.
  
  2. Type \`cd ${directory}\` to enter the subgraph.
  
  3. Run \`${installCommand}\` to install dependencies.
  
  4. Run \`${codegenCommand}\` to generate code from contract ABIs and the GraphQL schema.
  
  5. Run \`${deployCommand}\` to deploy the subgraph to
     https://thegraph.com/explorer/subgraph/${subgraphName}.

Make sure to visit the documentation on https://thegraph.com/docs/ for
further information.`)
  },
}
