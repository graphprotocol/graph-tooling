const chalk = require('chalk')
const compose = require('docker-compose')
const fs = require('fs-extra')
const tmp = require('tmp')
const Docker = require('dockerode')
const path = require('path')
const stripAnsi = require('strip-ansi')

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
      --dockerfile <file>       Custom Dockerfile for the test image (optional)
      --node-image <image>      Custom Graph Node image to test against (default: graphprotocol/graph-node:latest)
      --node-logs               Always print the Graph Node logs (optional)
  -w, --watch                   Regenerate types when subgraph files change (default: false)
`

module.exports = {
  description: 'Tests the current project against a Graph Node and Parity testnet',
  run: async toolbox => {
    // Obtain tools
    let { filesystem, print, system } = toolbox

    // Parse CLI parameters
    let {
      composeFile,
      dockerFile,
      h,
      help,
      nodeImage,
      nodeLogs,
      w,
      watch,
    } = toolbox.parameters.options

    // Support both short and long option variants
    help = help || h
    watch = watch || w

    // Extract test command
    let params = fixParameters(toolbox.parameters, {
      composeFile,
      dockerFile,
      h,
      help,
      nodeLogs,
      w,
      watch,
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

    // Copy source tree into the temporary directory under sources/
    let sources = path.join(tempdir, 'sources')
    if (!(await copySourcesToDir(toolbox, sources))) {
      process.exitCode = 1
      return
    }

    // Build the Docker test image from sources/
    if (!(await buildTestImage(toolbox, docker, sources, dockerFile))) {
      process.exitCode = 1
      return
    }

    // Create docker-compose configuration
    if (!(await configureCompose(toolbox, compose, tempdir, composeFile, nodeImage))) {
      process.exitCode = 1
      return
    }

    // Run tests
    let result = await runTests(toolbox, compose, tempdir, testCommand)

    if (result.exitCode == 0) {
      toolbox.print.success('✔ Tests passed')
    } else {
      toolbox.print.error('✖ Tests failed')
    }

    toolbox.print.info(result.output)

    if (result.exitCode !== 0 || nodeLogs) {
      toolbox.print.info('---')
      toolbox.print.info('Graph Node logs')
      toolbox.print.info('---')
      toolbox.print.info(toolbox.print.colors.muted(result.nodeLogs))
    }

    // Propagate the exit code from the test run
    process.exitCode = result.exitCode
  },
}

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

const buildTestImage = async (toolbox, docker, context, dockerFile) =>
  await withSpinner(
    `Build test image`,
    `Failed to build test image`,
    `Warnings building test image`,
    async spinner => {
      // Copy the dockerFile to the temporary source directory
      await toolbox.filesystem.copy(dockerFile, path.join(context, 'Dockerfile'))
      await toolbox.filesystem.copy(
        path.join(path.dirname(dockerFile), 'run-tests.sh'),
        path.join(context, 'run-tests.sh'),
      )

      // Build the testing image
      let buildStream = await docker.buildImage(
        {
          context,
          src: [path.basename(dockerFile), '.'],
        },
        {
          // FIXME: Give this a project-specific name
          t: 'graph-test',

          // Keep intermediate containers to speed up future test runs
          rm: false,
        },
      )

      return await new Promise((resolve, reject) =>
        docker.modem.followProgress(
          buildStream,
          (err, res) => (err ? reject(err) : resolve(res)),
        ),
      )
    },
  )

const configureCompose = async (toolbox, compose, tempdir, composeFile, nodeImage) =>
  await withSpinner(
    `Configure Docker Compose`,
    `Failed to configure Docker Compose`,
    `Warnings configuring Docker Compose`,
    async spinner => {
      // Temporary compose file
      let tempComposeFile = path.join(tempdir, 'compose', 'docker-compose.yml')

      // Copy the compose file to the temporary directory
      toolbox.filesystem.copy(composeFile, tempComposeFile)

      // Substitute the graph-node image with the custom one, if appropriate
      if (nodeImage) {
        toolbox.patching.replace(
          tempComposeFile,
          'graphprotocol/graph-node:latest',
          nodeImage,
        )
      }

      return true
    },
  )

const runTests = async (toolbox, compose, tempdir, testCommand) =>
  await withSpinner(
    `Run tests`,
    `Failed to run tests`,
    `Warnings running tests`,
    async spinner => {
      let result = await compose.run('test', testCommand, {
        cwd: path.join(tempdir, 'compose'),
        commandOptions: ['--service-ports'],
      })

      // Capture node logs
      let nodeLogs = await compose.logs('graph-node', {
        follow: false,
        cwd: path.join(tempdir, 'compose'),
      })

      await compose.down({ cwd: path.join(tempdir, 'compose') })

      return {
        exitCode: result.exitCode,
        nodeLogs: stripAnsi(nodeLogs.out.trim()).replace(/graph-node_1  \| /g, ''),
        output: result.out,
      }
    },
  )
