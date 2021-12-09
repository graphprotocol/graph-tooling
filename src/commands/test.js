const { Binary } = require('binary-install-raw')
const os = require('os')
const chalk = require('chalk')
const fetch = require('node-fetch')
const { exec } = require('child_process')
const fs = require('fs')
const semver = require('semver')

const HELP = `
${chalk.bold('graph test')} ${chalk.dim('[options]')} ${chalk.bold('<datasource>')}

${chalk.dim('Options:')}

  -f  --force                   Overwrite folder + file when downloading
  -h, --help                    Show usage information
  -l, --logs                    Logs to the console information about the OS, CPU model and download url (debugging purposes)
  -v, --version <tag>           Choose the version of the rust binary that you want to be downloaded/used
  -d, --docker                  Launches Matchstick in a docker container
  -c, --coverage                (Docker) Runs in coverage mode
  `

module.exports = {
  description: 'Runs rust binary for subgraph testing',
  run: async toolbox => {
    // Obtain tools
    let { print } = toolbox

    // Read CLI parameters
    let { f, force, h, help, l, logs, v, version, c, coverage, d, docker } = toolbox.parameters.options
    let datasource = toolbox.parameters.first

    // Support both long and short option variants
    force = force || f
    help = help || h
    logs = logs || l
    version = version || v
    coverage = coverage || c
    docker = docker || d

    // Show help text if requested
    if (help) {
      print.info(HELP)
      return
    }

    if (docker) {
      let url = `https://github.com/LimeChain/matchstick/releases/download/${version || '0.2.0a'}/binary-linux-20`

      if (version) {
       await fetch(url)
          .then(response => {
            if (response.status === 404) {
              print.info(`Error: Invalid Matchstick version '${version}'`)
              process.exit(1)
            }
          })
      }

      // TODO: Move these in separate file (in a function maybe)
      let contents = `FROM ubuntu:20.04
ENV ARGS=""
RUN apt update
RUN apt install -y nodejs
RUN apt install -y npm
COPY ./ ./
RUN npm run codegen
RUN npm run build
RUN apt install -y postgresql
RUN apt install -y curl
RUN apt-get update && apt-get -y install cmake protobuf-compiler
RUN curl -OL https://github.com/LimeChain/matchstick/releases/download/${version || "0.2.1a"}/binary-linux-20
RUN mv binary-linux-20 matchstick
RUN chmod a+x matchstick
CMD ./matchstick \${ARGS}`

      let dir = 'tests/.docker'

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      fs.writeFileSync('tests/.docker/Dockerfile', contents, (err) => {
        if (err) {
          print.info('A problem occurred while generating the Dockerfile. Please attend to the errors below.')
          print.info(err)
        } else {
          print.info('Successfully generated Dockerfile.')
        }
      })

      exec(`docker build -f tests/.docker/Dockerfile -t matchstick . `, (error, stdout, stderr) => {
        print.info('Building Matchstick image...')

        if (error) {
          print.info('A problem occurred while trying to build the Matchstick Docker image. Please attend to the errors below.')
          print.info(`error: ${error.message}`)
        }
        if (stderr) {
          print.info('A problem occurred while trying to build the Matchstick Docker image. Please attend to the errors below.')
          print.info(`stderr: ${stderr}`)
        }

        let runCommand = `docker run -e ARGS="${datasource || ''}${coverage ? '-c' : ''}" --rm matchstick`

        console.log('runCommand output')
        console.log(runCommand)
        print.info('runCommand output')
        print.info(runCommand)

        exec(runCommand, (error, stdout, stderr) => {
          print.info('Running Matchstick image...')

          if (error) {
            print.info('A problem occurred while trying to run the Matchstick Docker image. Please attend to the errors below.')
            print.info(`error: ${error.message}`)
            process.exit(1)
          }
          if (stderr) {
            print.info('A problem occurred while trying to run the Matchstick Docker image. Please attend to the errors below.')
            print.info(`stderr: ${stderr}`)
            process.exit(1)
          }
          print.info(stdout)
          process.exit()
        })
      })

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
  },
}

function getPlatform(logs) {
  const type = os.type()
  const arch = os.arch()
  const release = os.release()
  const cpuCore = os.cpus()[0]
  const majorVersion = semver.major(release)
  const isM1 = cpuCore.model.includes('Apple M1')

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
