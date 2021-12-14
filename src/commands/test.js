const os = require('os')
const chalk = require('chalk')
const fetch = require('node-fetch')
const { fixParameters } = require('../command-helpers/gluegun')
const semver = require('semver')
const { spawn, exec } = require('child_process')
const fs = require('fs')

const HELP = `
${chalk.bold('graph test')} ${chalk.dim('[options]')} ${chalk.bold('<datasource>')}

${chalk.dim('Options:')}
  -h, --help                    Show usage information
  -v, --version <tag>           Choose the version of the rust binary that you want to be downloaded/used
  -c, --coverage                Run tests in coverage mode (works with v0.2.2 and above)
  -f, --flags <flags>
  `

module.exports = {
  description: 'Runs rust binary for subgraph testing',
  run: async toolbox => {
    // Obtain tools
    let { print } = toolbox

    // Read CLI parameters
    let { h, help, v, version, c, coverage } = toolbox.parameters.options

    // Support both long and short option variants
    let help_opt = help || h
    let version_opt = version || v
    let coverage_opt = coverage || c

    // Fix if a boolean flag (-h, --help, -c, --coverage) has an argument
    try {
      fixParameters(toolbox.parameters, {
        h,
        help,
        c,
        coverage,
      })
    } catch (e) {
      print.error(e.message)
      process.exitCode = 1
      return
    }

    let datasource = toolbox.parameters.first || toolbox.parameters.array[0]

    // Show help text if requested
    if (help_opt) {
      print.info(HELP)
      return
    }

    if(version_opt) {
      let url = `https://github.com/LimeChain/matchstick/releases/download/${version_opt || "0.2.2a"}/binary-linux-20`;

      await fetch(url)
        .then(response => {
          if (response.status === 404){
            print.info(`Error: Invalid Matchstick version '${version_opt}'`);
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
RUN curl -OL https://github.com/LimeChain/matchstick/releases/download/${version_opt || "0.2.2a"}/binary-linux-20
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
    // Fix true/false options with gluegun.

    // Run a command to check if matchstick image already exists
    exec('docker images -q matchstick', (error, stdout, stderr) => {
      // Getting the current working folder that will be passed to the
      // `docker run` command to be bind mounted.
      let current_folder = process.cwd();
      let test_args = '';

      if(datasource) {
        test_args = test_args + datasource
      }

      if(coverage_opt) {
        test_args = test_args + ' ' + '-c'
      }

      let docker_run_opts = ['run', '-it', '--rm', '--mount', `type=bind,source=${current_folder},target=/matchstick`];

      if(test_args !== '') {
        docker_run_opts.push('-e')
        docker_run_opts.push(`ARGS=${test_args.trim()}`);
      }

      docker_run_opts.push('matchstick')

      // If a matchstick image does not exists, the command returns an empty string,
      // else it'll return the image ID. Skip `docker build` if an image already exists
      // If `-v/--version` is specified, delete current image(if any) and rebuild.
      // Use spawn() and {stdio: 'inherit'} so we can see the logs in real time.
      if(stdout === '' || version_opt) {
        if (stdout !== '' && version_opt) {
          exec('docker image rm matchstick', (error, stdout, stderr) => {
            print.info(chalk.bold(`Removing matchstick image\n${stdout}`));
          });
        }
        // Build a docker image. If the process has executed successfully
        // run a container from that image.
        spawn(
          'docker',
          ['build', '-f', 'tests/.docker/Dockerfile', '-t', 'matchstick', '.'],
          { stdio: 'inherit' }
        ).on('close', code => {
          if (code === 0) {
             spawn('docker', docker_run_opts, { stdio: 'inherit' });
          }
        })
      } else {
        // Run the container from the existing matchstick docker image
        spawn('docker', docker_run_opts, { stdio: 'inherit' });
      }
    })
  },
}
