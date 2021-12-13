const os = require('os')
const chalk = require('chalk')
const fetch = require('node-fetch')
const semver = require('semver')
const { exec } = require('child_process')
const fs = require('fs')

const HELP = `
${chalk.bold('graph test')} ${chalk.dim('[options]')} ${chalk.bold('<datasource>')}

${chalk.dim('Options:')}
  -h, --help                    Show usage information
  -v, --version <tag>           Choose the version of the rust binary that you want to be downloaded/used
  -c, --flags <flags>
  `

module.exports = {
  description: 'Runs rust binary for subgraph testing',
  run: async toolbox => {
    // Obtain tools
    let { print } = toolbox

    // Read CLI parameters
    let { h, help, v, version, c, coverage, l, lib } = toolbox.parameters.options
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

    exec(`docker build -f tests/.docker/Dockerfile -t matchstick . `, (error, stdout, stderr) => {
      print.info('Building Matchstick image...');

      if (error) {
        print.info('A problem occurred while trying to build the Matchstick Docker image. Please attend to the errors below.');
        print.info(`error: ${error.message}`)
      }
      if (stderr) {
        print.info('A problem occurred while trying to build the Matchstick Docker image. Please attend to the errors below.');
        print.info(`stderr: ${stderr}`)
      }

      let runCommand = `docker run -e ARGS="${datasource || ""}${coverage ? "-c" : ""}" --rm matchstick`;

      console.log("runCommand output");
      console.log(runCommand);
      print.info("runCommand output");
      print.info(runCommand);

      exec(runCommand, (error, stdout, stderr) => {
        print.info('Running Matchstick image...');

        if (error) {
          print.info('A problem occurred while trying to run the Matchstick Docker image. Please attend to the errors below.');
          print.info(`error: ${error.message}`)
          process.exit(1);
        }
        if (stderr) {
          print.info('A problem occurred while trying to run the Matchstick Docker image. Please attend to the errors below.');
          print.info(`stderr: ${stderr}`)
          process.exit(1);
        }
        print.info(stdout)
        process.exit();
      })
    })

  },
}