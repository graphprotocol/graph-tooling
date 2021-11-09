const { Binary } = require('binary-install-raw')
const os = require('os')
const chalk = require('chalk')
const fetch = require('node-fetch')
const semver = require('semver')

const HELP = `
${chalk.bold('graph test')} ${chalk.dim('[options]')} ${chalk.bold('<datasource>')}

${chalk.dim('Options:')}

  -f  --force                   Overwrite folder + file when downloading
  -h, --help                    Show usage information
  -l, --logs                    Logs to the console information about the OS, CPU model and download url (debugging purposes)
  -v, --version <tag>           Choose the version of the rust binary that you want to be downloaded/used
  `

module.exports = {
  description: 'Runs rust binary for subgraph testing',
  run: async toolbox => {
    // Obtain tools
    let { print } = toolbox

    // Read CLI parameters
    let { f, force, h, help, l, logs, v, version } = toolbox.parameters.options
    let datasource = toolbox.parameters.first

    // Support both long and short option variants
    force = force || f
    help = help || h
    logs = logs || l
    version = version || v

    // Show help text if requested
    if (help) {
      print.info(HELP)
      return
    }

    const platform = getPlatform(logs)
    if (!version) {
      let result = await fetch('https://api.github.com/repos/LimeChain/matchstick/releases/latest')
      let json = await result.json()
      version = json.tag_name
    }

    const url = `https://github.com/LimeChain/matchstick/releases/download/${version}/${platform}`

    if (logs) {
      console.log(`Download link: ${url}`)
    }

    let binary = new Binary(platform, url, version)
    await binary.install(force)
    datasource ? binary.run(datasource) : binary.run()
  }
}

function getPlatform(logs) {
  const type = os.type()
  const arch = os.arch()
  const release = os.release()
  const cpuCore = os.cpus()[0]
  const majorVersion = semver.major(release)
  const isM1 = cpuCore.model.includes("Apple M1")

  if (logs) {
    console.log(`OS type: ${type}\nOS arch: ${arch}\nOS release: ${release}\nOS major version: ${majorVersion}\nCPU model: ${cpuCore.model}`)
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
