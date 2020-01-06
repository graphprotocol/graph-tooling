const chalk = require('chalk')
const compose = require('docker-compose')
const fs = require('fs-extra')
const http = require('http')
const tmp = require('tmp')
const Docker = require('dockerode')
const path = require('path')
const stripAnsi = require('strip-ansi')
const util = require('util')
const exec = util.promisify(require('child_process').exec)

const { createCompiler } = require('../command-helpers/compiler')
const { fixParameters } = require('../command-helpers/gluegun')
const { withSpinner } = require('../command-helpers/spinner')

// Clean up temporary files even when an uncaught exception occurs
tmp.setGracefulCleanup()

const HELP = `
${chalk.bold('graph test')} [options] ${chalk.bold('<test-command>')}

Options:

  -h, --help                    Show usage information
      --compose-file <file>     Custom Docker Compose file for additional services (optional)
      --node-image <image>      Custom Graph Node image to test against (default: graphprotocol/graph-node:latest)
      --node-logs               Print the Graph Node logs (optional)
      --deterministic-output    Make the output deterministic by redacting known variable parts
`

module.exports = {
  description: 'Tests the current project against a Graph Node and Parity testnet',
  run: async toolbox => {
    // Obtain tools
    let { filesystem, print, system } = toolbox

    // Parse CLI parameters
    let {
      composeFile,
      deterministicOutput,
      h,
      help,
      nodeImage,
      nodeLogs,
    } = toolbox.parameters.options

    // Support both short and long option variants
    help = help || h

    // Extract test command
    let params = fixParameters(toolbox.parameters, {
      deterministicOutput,
      h,
      help,
      nodeLogs,
    })

    // Show help text if requested
    if (help) {
      print.info(HELP)
      return
    }

    if (params.length == 0) {
      print.error(`Test command not provided as the last argument`)
      process.exitCode = 1
      return
    }

    let testCommand = params[0]

    // Create Docker client
    let docker = new Docker()

    // Obtain the docker file to build the test image from
    dockerFile =
      dockerFile || path.join(__dirname, '..', '..', 'resources', 'test', 'Dockerfile')
    if (!filesystem.exists(dockerFile)) {
      print.error(`Dockerfile \`${dockerFile}\` for the test image not found`)
      process.exitCode = 1
      return
    }

    // Obtain the Docker Compose file for services that the tests run against
    composeFile =
      composeFile ||
      path.join(__dirname, '..', '..', 'resources', 'test', 'docker-compose.yml')
    if (!filesystem.exists(composeFile)) {
      print.error(`Docker Compose file \`${composeFile}\` not found`)
      process.exitCode = 1
      return
    }

    // Create temporary directory to operate in
    let tempdir = tmp.dirSync({ prefix: 'graph-test', unsafeCleanup: true }).name
    if (!(await configureCompose(toolbox, tempdir, composeFile, nodeImage))) {
      process.exitCode = 1
      return
    }

    // Bring up Graph Node
    if (!(await startGraphNode(toolbox, tempdir))) {
      toolbox.print.error('')
      toolbox.print.error('  Graph Node')
      toolbox.print.error('  ----------')
      toolbox.print.error(indent('  ', await graphNodeLogs(toolbox, tempdir)))
      process.exitCode = 1
      return
    }

    // Run tests
    let result = await runTests(toolbox, tempdir, testCommand)

    // Bring down Graph Node
    await stopGraphNode(toolbox, tempdir)

    if (result.exitCode == 0) {
      toolbox.print.success('✔ Tests passed')
    } else {
      toolbox.print.error('✖ Tests failed')
    }

    // Always print the test output
    toolbox.print.info('')
    toolbox.print.info('  Output')
    toolbox.print.info('  ------')
    toolbox.print.info('')
    toolbox.print.info(indent('  ', prepareOutput(result.stdout, deterministicOutput)))

    if (result.exitCode !== 0) {
      // If there was an error, print the error output as well
      toolbox.print.error('')
      toolbox.print.error('  Errors')
      toolbox.print.error('  ------')
      toolbox.print.error('')
      toolbox.print.error(indent('  ', prepareOutput(result.stderr, deterministicOutput)))
    }

    if (result.exitCode !== 0 || nodeLogs) {
      toolbox.print.info('')
      toolbox.print.info('  Graph Node')
      toolbox.print.info('  ----------')
      toolbox.print.info('')
      toolbox.print.info(
        indent('  ', prepareOutput(result.nodeLogs, deterministicOutput)),
      )
    }

    // Propagate the exit code from the test run
    process.exitCode = result.exitCode
  },
}

/**
 * Indents all lines of a string
 */
const indent = (indentation, str) =>
  str
    .split('\n')
    .map(s => `${indentation}${s}`)
    // Remove whitespace from empty lines
    .map(s => s.replace(/^\s+$/g, ''))
    .join('\n')

// Copy source directory into the temporary directory
const copySourcesToDir = async (toolbox, outputDir) =>
  await withSpinner(
    'Copy sources to temporary directory',
    'Failed to copy sources to temporary directory',
    'Warnings copying sources to temporary directory',
    async spinner => {
      await toolbox.filesystem.copy(process.cwd(), outputDir, {
        matching: ['!node_modules'],
      })
      return true
    },
  )
/**
 * Transforms a test output string so it is deterministic.
 */
const prepareOutput = (str, deterministic) =>
  stripAnsi(str)
    // Remove leading and trailing whitespace
    .trim()
    // Split up into an array of lines
    .split('\n')
    // Substitute temporary truffle directory to make output deterministic
    .map(s =>
      deterministic ? s.replace(/^(> Artifacts written to) .*$/g, '$1 TEMPDIR') : s,
    )
    // Substitute output timing to make output deterministic
    .map(s =>
      deterministic
        ? s.replace(/^(.* passing) \([0-9\.]+s\).*/g, '$1 (TIME REDACTED)')
        : s,
    )
    .join('\n')

const configureCompose = async (toolbox, tempdir, composeFile, nodeImage) =>
  await withSpinner(
    `Configure Docker Compose`,
    `Failed to configure Docker Compose`,
    `Warnings configuring Docker Compose`,
    async spinner => {
      // Temporary compose file
      let tempComposeFile = path.join(tempdir, 'compose', 'docker-compose.yml')

      // Copy the compose file to the temporary directory
      await toolbox.filesystem.copy(composeFile, tempComposeFile)

      // Substitute the graph-node image with the custom one, if appropriate
      if (nodeImage) {
        await toolbox.patching.replace(
          tempComposeFile,
          'graphprotocol/graph-node:latest',
          nodeImage,
        )
      }

      return true
    },
  )

const startGraphNode = async (toolbox, tempdir) =>
  await withSpinner(
    `Start Graph Node`,
    `Failed to start Graph Node`,
    `Warnings starting Graph Node`,
    async spinner => {
      // Bring up Graph Node
      await compose.upAll({
        cwd: path.join(tempdir, 'compose'),
      })

      // Wait for Graph Node
      await waitForGraphNode(toolbox)
      return true
    },
  )

const stopGraphNode = async (toolbox, tempdir) =>
  await compose.down({ cwd: path.join(tempdir, 'compose') })

const waitForGraphNode = toolbox => {
  // Give the node 30 seconds to come up
  let deadline = Date.now() + 30 * 1000

  let lastError = undefined

  return new Promise((resolve, reject) => {
    const pingNode = () => {
      if (Date.now() > deadline) {
        reject(`Failed to connect to Graph Node: ${lastError}`)
      } else {
        http
          .get('http://localhost:8000/subgraphs', response => {
            if (response.statusCode < 400) {
              resolve()
            } else {
              setTimeout(pingNode, 500)
            }
          })
          .on('error', e => {
            lastError = e
            setTimeout(pingNode, 500)
          })
      }
    }

    setTimeout(pingNode, 0)
  })
}

const graphNodeLogs = async (toolbox, tempdir) => {
  let logs = await compose.logs('graph-node', {
    follow: false,
    cwd: path.join(tempdir, 'compose'),
  })
  return stripAnsi(logs.out.trim()).replace(/graph-node_1  \| /g, '')
}

const runTests = async (toolbox, tempdir, testCommand) =>
  await withSpinner(
    `Run tests`,
    `Failed to run tests`,
    `Warnings running tests`,
    async spinner => {
      // Run the test command
      let result = {
        exitCode: 0,
        output: '',
      }

      try {
        let { stdout, stderr } = await exec(testCommand, { trim: true })
        result.stdout = stdout
        result.stderr = undefined
      } catch (e) {
        result.exitCode = e.code
        result.stdout = e.stdout
        result.stderr = e.stderr
      }

      return {
        ...result,
        nodeLogs: await graphNodeLogs(toolbox, tempdir),
      }
    },
  )
