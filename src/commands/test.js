const chalk = require('chalk')
const compose = require('docker-compose')
const fs = require('fs-extra')
const http = require('http')
const net = require('net')
const tmp = require('tmp')
const Docker = require('dockerode')
const path = require('path')
const stripAnsi = require('strip-ansi')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const spawn = require('child_process').spawn

const { createCompiler } = require('../command-helpers/compiler')
const { fixParameters } = require('../command-helpers/gluegun')
const { step, withSpinner } = require('../command-helpers/spinner')

// Clean up temporary files even when an uncaught exception occurs
tmp.setGracefulCleanup()

const HELP = `
${chalk.bold('graph test')} [options] ${chalk.bold('<test-command>')}

Options:

  -h, --help                    Show usage information
      --node-logs               Print the Graph Node logs (optional)
      --compose-file <file>     Custom Docker Compose file for additional services (optional)
      --node-image <image>      Custom Graph Node image to test against (default: graphprotocol/graph-node:latest)
      --standalone-node <cmd>   Use a standalone Graph Node outside Docker Compose (optional)
      --standalone-node-args    Custom arguments to be passed to the standalone Graph Node (optional)
      --skip-wait-for-ipfs      Don't wait for IPFS to be up at localhost:5001 (optional)
      --skip-wait-for-ethereum  Don't wait for Ethereum to be up at localhost:8545 (optional)
      --skip-wait-for-postgres  Don't wait for Postgres to be up at localhost:5432 (optional)
`

module.exports = {
  description: 'Tests the current project against a Graph Node and Parity testnet',
  run: async toolbox => {
    // Obtain tools
    let { filesystem, print, system } = toolbox

    // Parse CLI parameters
    let {
      composeFile,
      h,
      help,
      nodeImage,
      nodeLogs,
      skipWaitForEthereum,
      skipWaitForIpfs,
      skipWaitForPostgres,
      standaloneNode,
      standaloneNodeArgs,
    } = toolbox.parameters.options

    // Support both short and long option variants
    help = help || h

    // Extract test command
    let params = fixParameters(toolbox.parameters, {
      h,
      help,
      nodeLogs,
      skipWaitForEthereum,
      skipWaitForIpfs,
      skipWaitForPostgres,
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

    // Obtain the Docker Compose file for services that the tests run against
    composeFile =
      composeFile ||
      path.join(
        __dirname,
        '..',
        '..',
        'resources',
        'test',
        standaloneNode ? 'docker-compose-standalone-node.yml' : 'docker-compose.yml',
      )
    if (!filesystem.exists(composeFile)) {
      print.error(`Docker Compose file \`${composeFile}\` not found`)
      process.exitCode = 1
      return
    }

    // Create temporary directory to operate in
    let tempdir = tmp.dirSync({ prefix: 'graph-test', unsafeCleanup: true }).name
    try {
      await configureTestEnvironment(toolbox, tempdir, composeFile, nodeImage)
    } catch {
      process.exitCode = 1
      return
    }

    // Bring up test environment
    try {
      await startTestEnvironment(toolbox, tempdir)
    } catch {
      process.exitCode = 1
      return
    }

    // Wait for test environment to come up
    try {
      await waitForTestEnvironment(toolbox, {
        skipWaitForEthereum,
        skipWaitForIpfs,
        skipWaitForPostgres,
      })
    } catch {
      await stopTestEnvironment(toolbox, tempdir)
      process.exitCode = 1
      return
    }

    // Bring up Graph Node separately, if a standalone node is used
    let nodeProcess
    let nodeOutputChunks = []
    if (standaloneNode) {
      try {
        nodeProcess = await startGraphNode(
          toolbox,
          standaloneNode,
          standaloneNodeArgs,
          nodeOutputChunks,
        )
      } catch {
        toolbox.print.error('')
        toolbox.print.error('  Graph Node')
        toolbox.print.error('  ----------')
        toolbox.print.error(
          indent('  ', Buffer.concat(nodeOutputChunks).toString('utf-8')),
        )
        toolbox.print.error('')
        await stopTestEnvironment(toolbox, tempdir)
        process.exitCode = 1
        return
      }
    }

    // Wait for Graph Node to come up
    try {
      await waitForGraphNode(toolbox)
    } catch {
      toolbox.print.error('')
      toolbox.print.error('  Graph Node')
      toolbox.print.error('  ----------')
      toolbox.print.error(
        indent(
          '  ',
          await graphNodeLogs(toolbox, tempdir, standaloneNode, nodeOutputChunks),
        ),
      )
      toolbox.print.error('')
      await stopTestEnvironment(toolbox, tempdir)
      process.exitCode = 1
      return
    }

    // Run tests
    let result = await runTests(toolbox, tempdir, testCommand)

    // Bring down Graph Node, if a standalone node is used
    if (nodeProcess) {
      try {
        await stopGraphNode(toolbox, nodeProcess)
      } catch {
        // do nothing (the spinner already logs the problem)
      }
    }

    // Bring down the test environment
    try {
      await stopTestEnvironment(toolbox, tempdir)
    } catch {
      // do nothing (the spinner already logs the problem)
    }

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
    toolbox.print.info(indent('  ', result.stdout))

    if (result.exitCode !== 0) {
      // If there was an error, print the error output as well
      toolbox.print.error('')
      toolbox.print.error('  Errors')
      toolbox.print.error('  ------')
      toolbox.print.error('')
      toolbox.print.error(indent('  ', result.stderr))
    }

    if (result.exitCode !== 0 || nodeLogs) {
      toolbox.print.info('')
      toolbox.print.info('  Graph Node')
      toolbox.print.info('  ----------')
      toolbox.print.info('')
      toolbox.print.info(
        indent(
          '  ',
          await graphNodeLogs(toolbox, tempdir, standaloneNode, nodeOutputChunks),
        ),
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

const configureTestEnvironment = async (toolbox, tempdir, composeFile, nodeImage) =>
  await withSpinner(
    `Configure test environment`,
    `Failed to configure test environment`,
    `Warnings configuring test environment`,
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
    },
  )

const waitFor = async (timeout, testFn) => {
  let deadline = Date.now() + timeout
  let error = undefined
  return new Promise((resolve, reject) => {
    const check = async () => {
      if (Date.now() > deadline) {
        reject(error)
      } else {
        try {
          let result = await testFn()
          resolve(result)
        } catch (e) {
          error = e
          setTimeout(check, 500)
        }
      }
    }

    setTimeout(check, 0)
  })
}

const startTestEnvironment = async (toolbox, tempdir) =>
  await withSpinner(
    `Start test environment`,
    `Failed to start test environment`,
    `Warnings starting test environment`,
    async spinner => {
      // Bring up the test environment
      await compose.upAll({
        cwd: path.join(tempdir, 'compose'),
      })
    },
  )

const waitForTestEnvironment = async (
  toolbox,
  { skipWaitForEthereum, skipWaitForIpfs, skipWaitForPostgres },
) =>
  await withSpinner(
    `Wait for test environment`,
    `Failed to wait for test environment`,
    `Warnings waiting for test environment`,
    async spinner => {
      // Wait 10s for IPFS (if desired)
      if (skipWaitForIpfs) {
        step(spinner, 'Skip waiting for IPFS')
      } else {
        await waitFor(
          10000,
          async () =>
            new Promise((resolve, reject) => {
              http
                .get('http://localhost:5001/api/v0/version', response => {
                  resolve()
                })
                .on('error', e => {
                  reject(new Error(`Could not connect to IPFS: ${e}`))
                })
            }),
        )
        step(spinner, 'IPFS is up')
      }

      // Wait 10s for Ethereum (if desired)
      if (skipWaitForEthereum) {
        step(spinner, 'Skip waiting for Ethereum')
      } else {
        await waitFor(
          10000,
          async () =>
            new Promise((resolve, reject) => {
              http
                .get('http://localhost:8545', response => {
                  resolve()
                })
                .on('error', e => {
                  reject(new Error(`Could not connect to Ethereum: ${e}`))
                })
            }),
        )
        step(spinner, 'Ethereum is up')
      }

      // Wait 10s for Postgres (if desired)
      if (skipWaitForPostgres) {
        step(spinner, 'Skip waiting for Postgres')
      } else {
        await waitFor(
          10000,
          async () =>
            new Promise((resolve, reject) => {
              try {
                let socket = net.connect(5432, 'localhost', () => resolve())
                socket.on('error', e =>
                  reject(new Error(`Could not connect to Postgres: ${e}`)),
                )
                socket.end()
              } catch (e) {
                reject(new Error(`Could not connect to Postgres: ${e}`))
              }
            }),
        )
        step(spinner, 'Postgres is up')
      }
    },
  )

const stopTestEnvironment = async (toolbox, tempdir) =>
  await withSpinner(
    `Stop test environment`,
    `Failed to stop test environment`,
    `Warnings stopping test environment`,
    async spinner => {
      await compose.down({ cwd: path.join(tempdir, 'compose') })
    },
  )

const startGraphNode = async (
  toolbox,
  standaloneNode,
  standaloneNodeArgs,
  nodeOutputChunks,
) =>
  await withSpinner(
    `Start Graph node`,
    `Failed to start Graph node`,
    `Warnings starting Graph node`,
    async spinner => {
      let defaultArgs = [
        '--ipfs',
        'localhost:5001',
        '--postgres-url',
        'postgresql://graph:let-me-in@localhost:5432/graph',
        '--ethereum-rpc',
        'test:http://localhost:8545',
      ]

      let defaultEnv = {
        GRAPH_LOG: 'trace',
        GRAPH_TOKIO_THREAD_COUNT: 10,
      }

      let args = standaloneNodeArgs ? standaloneNodeArgs.split(' ') : defaultArgs
      let env = { ...defaultEnv, ...process.env }

      let nodeProcess = spawn(standaloneNode, args, {
        cwd: process.cwd(),
        env,
      })

      step(spinner, 'Graph node:', `${nodeProcess.spawnargs.join(' ')}`)

      nodeProcess.stdout.on('data', data => nodeOutputChunks.push(Buffer.from(data)))
      nodeProcess.stderr.on('data', data => nodeOutputChunks.push(Buffer.from(data)))
      nodeProcess.on('error', e => {
        nodeOutputChunks.push(Buffer.from(`${e}`, 'utf-8'))
      })

      // Return the node child process
      return nodeProcess
    },
  )

const waitForGraphNode = async toolbox =>
  await withSpinner(
    `Wait for Graph node`,
    `Failed to wait for Graph node`,
    `Warnings waiting for Graph node`,
    async spinner => {
      await waitFor(
        10000,
        async () =>
          new Promise((resolve, reject) => {
            http.get('http://localhost:8000', () => resolve()).on('error', e => reject(e))
          }),
      )
    },
  )

const stopGraphNode = async (toolbox, nodeProcess) =>
  await withSpinner(
    `Stop Graph node`,
    `Failed to stop Graph node`,
    `Warnings stopping Graph node`,
    async spinner => {
      nodeProcess.kill()
    },
  )

const graphNodeLogs = async (toolbox, tempdir, standaloneNode, nodeOutputChunks) => {
  if (standaloneNode) {
    // Pull the logs from the captured output
    return stripAnsi(Buffer.concat(nodeOutputChunks).toString('utf-8'))
  } else {
    // Pull the logs from docker compose
    let logs = await compose.logs('graph-node', {
      follow: false,
      cwd: path.join(tempdir, 'compose'),
    })
    return stripAnsi(logs.out.trim()).replace(/graph-node_1  \| /g, '')
  }
}

const runTests = async (toolbox, tempdir, testCommand) =>
  await withSpinner(
    `Run tests`,
    `Failed to run tests`,
    `Warnings running tests`,
    async spinner => {
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

      return result
    },
  )
