const { Binary } = require('binary-install-raw')
const os = require('os')
const chalk = require('chalk')
const fetch = require('node-fetch')
const { filesystem, print } = require('gluegun')
const { fixParameters } = require('../command-helpers/gluegun')
const semver = require('semver')
const { spawn, exec } = require('child_process')
const yaml = require('js-yaml')

const HELP = `
${chalk.bold('graph test')} ${chalk.dim('[options]')} ${chalk.bold('<datasource>')}

${chalk.dim('Options:')}
  -c, --coverage                Run the tests in coverage mode. Works with v0.2.1 and above
  -d, --docker                  Run the tests in a docker container(Note: Please execute from the root folder of the subgraph)
  -f  --force                   Binary - overwrites folder + file when downloading. Docker - rebuilds the docker image
  -h, --help                    Show usage information
  -l, --logs                    Logs to the console information about the OS, CPU model and download url (debugging purposes)
  -r, --recompile               Force-recompile tests (Not available in 0.2.2 and earlier versions)
  -v, --version <tag>           Choose the version of the rust binary that you want to be downloaded/used
  `

module.exports = {
  description: 'Runs rust binary for subgraph testing',
  run: async toolbox => {
    // Read CLI parameters
    let {
      c,
      coverage,
      d,
      docker,
      f,
      force,
      h,
      help,
      l,
      logs,
      r,
      recompile,
      v,
      version,
    } = toolbox.parameters.options

    let opts = new Map()
    // Support both long and short option variants
    opts.set("coverage", coverage || c)
    opts.set("docker", docker || d)
    opts.set("force", force || f)
    opts.set("help", help || h)
    opts.set("logs", logs || l)
    opts.set("recompile", recompile || r)
    opts.set("version", version || v)

    // Fix if a boolean flag (e.g -c, --coverage) has an argument
    try {
      fixParameters(toolbox.parameters, {
        h,
        help,
        c,
        coverage,
        d,
        docker,
        f,
        force,
        l,
        logs,
        r,
        recompile
      })
    } catch (e) {
      print.error(e.message)
      process.exitCode = 1
      return
    }

    let datasource = toolbox.parameters.first || toolbox.parameters.array[0]

    // Show help text if requested
    if (opts.get("help")) {
      print.info(HELP)
      return
    }

    let result = await fetch('https://api.github.com/repos/LimeChain/matchstick/releases/latest')
    let json = await result.json()
    opts.set("latestVersion", json.tag_name)

    if(opts.get("docker")) {
      runDocker(datasource, opts)
    } else {
      runBinary(datasource, opts)
    }
  }
}

async function runBinary(datasource, opts) {
  let coverageOpt = opts.get("coverage")
  let forceOpt = opts.get("force")
  let logsOpt = opts.get("logs")
  let versionOpt = opts.get("version")
  let latestVersion = opts.get("latestVersion")
  let recompileOpt = opts.get("recompile")

  const platform = getPlatform(logsOpt)

  const url = `https://github.com/LimeChain/matchstick/releases/download/${versionOpt || latestVersion}/${platform}`

  if (logsOpt) {
    print.info(`Download link: ${url}`)
  }

  let binary = new Binary(platform, url, versionOpt || latestVersion)
  forceOpt ? await binary.install(true) : await binary.install(false)
  let args = new Array()

  if (coverageOpt) args.push('-c')
  if (recompileOpt) args.push('-r')
  if (datasource) args.push(datasource)
  args.length > 0 ? binary.run(...args) : binary.run()
}

function getPlatform(logsOpt) {
  const type = os.type()
  const arch = os.arch()
  const release = os.release()
  const cpuCore = os.cpus()[0]
  const majorVersion = semver.major(release)
  const isM1 = cpuCore.model.includes("Apple M1")

  if (logsOpt) {
    print.info(`OS type: ${type}\nOS arch: ${arch}\nOS release: ${release}\nOS major version: ${majorVersion}\nCPU model: ${cpuCore.model}`)
  }

  if (arch === 'x64' || (arch === 'arm64' && isM1)) {
    if (type === 'Darwin') {
      if (majorVersion === 19) {
        return 'binary-macos-10.15'
      } else if (majorVersion === 18) {
        return 'binary-macos-10.14'
      } else if (isM1) {
        return 'binary-macos-11-m1'
      }
      return 'binary-macos-11'
    } else if (type === 'Linux') {
      if (majorVersion === 18) {
        return 'binary-linux-18'
      }
      return 'binary-linux-20'
    } else if (type === 'Windows_NT') {
      return 'binary-windows'
    }
  }

  throw new Error(`Unsupported platform: ${type} ${arch} ${majorVersion}`)
}

async function runDocker(datasource, opts) {
  let coverageOpt = opts.get("coverage")
  let forceOpt = opts.get("force")
  let versionOpt = opts.get("version")
  let latestVersion = opts.get("latestVersion")
  let recompileOpt = opts.get("recompile")

  // Remove binary-install-raw binaries, because docker has permission issues
  // when building the docker images
  await filesystem.remove("./node_modules/binary-install-raw/bin")

  // Get current working directory
  let current_folder = await filesystem.cwd()

  // Build the Dockerfile location. Defaults to ./tests/.docker if
  // a custom testsFolder is not declared in the subgraph.yaml
  let dockerDir = ""

  try {
    let doc = await yaml.load(filesystem.read('subgraph.yaml', 'utf8'))
    testsFolder = doc.testsFolder || './tests'
    dockerDir = testsFolder.endsWith('/') ? testsFolder + '.docker' : testsFolder + '/.docker'
  } catch (error) {
    print.error(error.message)
    return
  }

  // Create the Dockerfile
  try {
    await filesystem.write(`${dockerDir}/Dockerfile`, dockerfile(versionOpt, latestVersion))
    print.info('Successfully generated Dockerfile.')
  } catch (error) {
    print.info('A problem occurred while generating the Dockerfile. Please attend to the errors below:')
    print.error(error.message)
    return
  }

  // Run a command to check if matchstick image already exists
  exec('docker images -q matchstick', (error, stdout, stderr) => {
    // Collect all(if any) flags and options that have to be passed to the matchstick binary
    let testArgs = ''
    if (coverageOpt) testArgs = testArgs + ' -c'
    if (recompileOpt) testArgs = testArgs + ' -r'
    if (datasource) testArgs = testArgs + ' ' + datasource

    // Build the `docker run` command options and flags
    let dockerRunOpts = ['run', '-it', '--rm', '--mount', `type=bind,source=${current_folder},target=/matchstick`]

    if(testArgs !== '') {
      dockerRunOpts.push('-e')
      dockerRunOpts.push(`ARGS=${testArgs.trim()}`)
    }

    dockerRunOpts.push('matchstick')

    // If a matchstick image does not exists, the command returns an empty string,
    // else it'll return the image ID. Skip `docker build` if an image already exists
    // If `-v/--version` is specified, delete current image(if any) and rebuild.
    // Use spawn() and {stdio: 'inherit'} so we can see the logs in real time.
    if(stdout === '' || versionOpt || forceOpt) {
      if ((stdout !== '' && versionOpt) || forceOpt) {
        exec('docker image rm matchstick', (error, stdout, stderr) => {
          print.info(chalk.bold(`Removing matchstick image\n${stdout}`))
        })
      }
      // Build a docker image. If the process has executed successfully
      // run a container from that image.
      spawn(
        'docker',
        ['build', '--no-cache', '-f', `${dockerDir}/Dockerfile`, '-t', 'matchstick', '.'],
        { stdio: 'inherit' }
      ).on('close', code => {
        if (code === 0) {
           spawn('docker', dockerRunOpts, { stdio: 'inherit' })
        }
      })
    } else {
      print.info("Docker image already exists. Skipping `docker build` command.")
      // Run the container from the existing matchstick docker image
      spawn('docker', dockerRunOpts, { stdio: 'inherit' })
    }
  })
}

// TODO: Move these in separate file (in a function maybe)
function dockerfile(versionOpt, latestVersion) {
  return `
  FROM ubuntu:20.04
  ENV ARGS=""

  # Install necessary packages
  RUN apt update
  RUN apt install -y nodejs
  RUN apt install -y npm
  RUN apt install -y git
  RUN apt install -y postgresql
  RUN apt install -y curl
  RUN apt install -y cmake
  RUN npm install -g @graphprotocol/graph-cli

  # Download the latest linux binary
  RUN curl -OL https://github.com/LimeChain/matchstick/releases/download/${versionOpt || latestVersion}/binary-linux-20

  # Make it executable
  RUN chmod a+x binary-linux-20

  # Create a matchstick dir where the host will be copied
  RUN mkdir matchstick
  WORKDIR matchstick

  # Copy host to /matchstick
  COPY ../ .

  RUN graph codegen
  RUN graph build

  CMD ../binary-linux-20 \${ARGS}`
}
