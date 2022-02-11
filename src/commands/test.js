const { Binary } = require('binary-install-raw')
const os = require('os')
const chalk = require('chalk')
const fetch = require('node-fetch')
const { filesystem, patching, print, system } = require('gluegun')
const { fixParameters } = require('../command-helpers/gluegun')
const path = require('path')
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

  const platform = await getPlatform(logsOpt)

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

async function getPlatform(logsOpt) {
  const type = os.type()
  const arch = os.arch()
  const cpuCore = os.cpus()[0]
  const isM1 = (arch === 'arm64' && /Apple (M1|processor)/.test(cpuCore.model))
  const linuxInfo = type === 'Linux' ? await getLinuxInfo() : new Map()
  const linuxDistro = linuxInfo.get('name')
  const release = linuxInfo.get('version') || os.release()
  const majorVersion = parseInt(linuxInfo.get('version'), 10) || semver.major(release)

  if (logsOpt) {
    print.info(`OS type: ${linuxDistro || type}\nOS arch: ${arch}\nOS release: ${release}\nOS major version: ${majorVersion}\nCPU model: ${cpuCore.model}`)
  }

  if (arch === 'x64' || isM1) {
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
      } else {
        return 'binary-linux-20'
      }
    } else if (type === 'Windows_NT') {
      return 'binary-windows'
    }
  }

  throw new Error(`Unsupported platform: ${type} ${arch} ${majorVersion}`)
}

async function getLinuxInfo() {
  try {
    let result = await system.run("cat /etc/*-release | grep -E '(^VERSION|^NAME)='", {trim: true})
    let infoArray = result.replace(/['"]+/g, '').split('\n').map(p => p.split('='))
    let infoMap = new Map();

    infoArray.forEach((val) => {
      infoMap.set(val[0].toLowerCase(), val[1])
    });

    return infoMap
  } catch (error) {
    print.error(`Error fetching the Linux version:\n ${error}`)
    process.exit(1)
  }
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

  // Declate dockerfilePath with default location
  let dockerfilePath = "./tests/.docker/Dockerfile"

  // Check if matchstick.yaml config exists
  if(filesystem.exists('matchstick.yaml')) {
    try {
      // Load the config
      let config = await yaml.load(filesystem.read('matchstick.yaml', 'utf8'))

      // Check if matchstick.yaml is not empty
      if(config != null) {
        // If a custom tests folder is declared update dockerfilePath
        dockerfilePath = path.join(config.testsFolder || 'tests', '.docker/Dockerfile')
      }
    } catch (error) {
      print.info('A problem occurred while reading matchstick.yaml. Please attend to the errors below:')
      print.error(error.message)
      process.exit(1)
    }
  }

  // Check if the Dockerfil already exists
  let dockerfileExists = filesystem.exists(dockerfilePath)

  // Generate the Dockerfile only if it doesn't exists,
  // version flag and/or force flag is passed.
  if(!dockerfileExists || versionOpt || forceOpt) {
    await dockerfile(dockerfilePath, versionOpt, latestVersion)
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
    // Delete current image(if any) and rebuild.
    // Use spawn() and {stdio: 'inherit'} so we can see the logs in real time.
    if(!dockerfileExists || stdout === '' || versionOpt || forceOpt) {
      if (stdout !== '') {
        exec('docker image rm matchstick', (error, stdout, stderr) => {
          print.info(chalk.bold(`Removing matchstick image\n${stdout}`))
        })
      }
      // Build a docker image. If the process has executed successfully
      // run a container from that image.
      spawn(
        'docker',
        ['build', '-f', dockerfilePath, '-t', 'matchstick', '.'],
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

// Downloads Dockerfile template from the demo-subgraph repo
// Replaces the placeholders with their respective values
async function dockerfile(dockerfilePath, versionOpt, latestVersion) {
  let spinner = print.spin("Generating Dockerfile...")

  try {
    // Fetch the Dockerfile template content from the demo-subgraph repo
    let content = await fetch('https://raw.githubusercontent.com/LimeChain/demo-subgraph/main/Dockerfile')
        .then((response) => {
          if (response.ok) {
            return response.text()
          } else {
            throw new Error(`Status Code: ${response.status}, with error: ${response.statusText}`);
          }
        })

    // Write the Dockerfile
    await filesystem.write(dockerfilePath, content)

    // Replaces the version placeholders
    await patching.replace(dockerfilePath, '<MATCHSTICK_VERSION>', versionOpt || latestVersion)

  } catch (error) {
    spinner.fail(`A problem occurred while generating the Dockerfile. Please attend to the errors below:\n ${error.message}`)
    process.exit(1)
  }

  spinner.succeed('Successfully generated Dockerfile.')
}
