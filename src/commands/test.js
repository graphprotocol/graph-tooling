const os = require('os')
const chalk = require('chalk')
const fetch = require('node-fetch')
const semver = require('semver')
const { spawn, exec } = require('child_process')
const fs = require('fs')

const HELP = `
${chalk.bold('graph test')} ${chalk.bold('<datasource>')} ${chalk.dim('[options]')}

${chalk.dim('Options:')}
  -h, --help                    Show usage information
  -v, --version <tag>           Choose the version of the rust binary that you want to be downloaded/used
  -c, --coverage                Run tests in coverage mode
  -f, --flags <flags>
  `

module.exports = {
  description: 'Runs rust binary for subgraph testing',
  run: async toolbox => {
    // Obtain tools
    let { print } = toolbox

    // Read CLI parameters
    let { h, help, v, version, c, coverage } = toolbox.parameters.options
    let datasource = toolbox.parameters.first

    // Support both long and short option variants
    help = help || h
    version = version || v
    coverage = coverage || c

    // Show help text if requested
    if (help) {
      print.info(HELP)
      return
    }

    if(version) {
      let url = `https://github.com/LimeChain/matchstick/releases/download/${version || "0.2.2a"}/binary-linux-20`;

      await fetch(url)
        .then(response => {
          if (response.status === 404){
            print.info(`Error: Invalid Matchstick version '${version}'`);
            process.exit(1);
          }
        })
    }

    // TODO: Move these in separate file (in a function maybe)
    let contents = `# I'll try to run it on alpine
FROM ubuntu:20.04

# Not sure if this ENV declaration is necessary
ENV ARGS=""

# Install necessary packages
RUN apt update
RUN apt install -y nodejs
RUN apt install -y npm
RUN apt install -y git
RUN apt install -y postgresql
RUN apt install -y curl
RUN npm install -g @graphprotocol/graph-cli

# Download the latest linux binary
RUN curl -OL https://github.com/LimeChain/matchstick/releases/download/${version || "0.2.2a"}/binary-linux-20
# Make it executable
RUN chmod a+x binary-linux-20

# Create a matchstick dir where the host will be copied
RUN mkdir matchstick
WORKDIR matchstick

# Copy host to /matchstick
COPY ../ .

RUN graph codegen
RUN graph build

CMD ../binary-linux-20 \${ARGS}
`

    let dir = 'tests/.docker';

    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync('tests/.docker/Dockerfile', contents, (err) => {
      if (err) {
        print.info('A problem occurred while generating the Dockerfile. Please attend to the errors below.');
        print.info(err);
      }
      else {
        print.info('Successfully generated Dockerfile.')
      }
    })

    // TODOs:
    // 1. Fix true/false options with gluegun.
    // 2. If -v/--version is passed, delete current image and build again.

    // Run a command to check if matchstick image already exists
    exec('docker images -q matchstick', (error, stdout, stderr) => {
      // Getting the current working folder that will be passed to the
      // `docker run` command to be bind mounted.
      let current_folder = process.cwd();
      let args = '';

      if(datasource) {
        args = args + datasource
      }

      if(coverage) {
        args = args + ' ' + '-c'
      }

      let options = ['run', '-it', '--rm', '--mount', `type=bind,source=${current_folder},target=/matchstick`];

      if(args !== '') {
        options.push('-e')
        options.push(`ARGS=${args.trim()}`);
      }

      options.push('matchstick')

      // If a matchstick image does not exists, the command returns an empty string,
      // else it'll return the image ID. Skip `docker build` if an image already exists
      // Use spawn() and {stdio: 'inherit'} so we can see the logs in real time.
      if(stdout === "") {
        // Build a docker image. If the process has executed successfully
        // run a container from that image.
        spawn(
          'docker',
          ['build', '-f', 'tests/.docker/Dockerfile', '-t', 'matchstick', '.'],
          { stdio: 'inherit' }
        ).on('close', code => {
          if (code === 0) {
             spawn('docker', options, { stdio: 'inherit' });
          }
        })
      } else {
        // Run the container from the existing matchstick docker image
        spawn('docker', options, { stdio: 'inherit' });
      }
    })
  },
}
