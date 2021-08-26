const { Binary } = require('binary-install-raw')
const { XMLHttpRequest } = require('xmlhttprequest')
const os = require('os')
const chalk = require('chalk')

const HELP = `
${chalk.bold('graph test')} ${chalk.dim('[options]')} ${chalk.bold('<datasource>')}

${chalk.dim('Options:')}

  -f  --force                   Overwrite folder + file when downloading
  -h, --help                    Show usage information
  -v, --version <tag>           Choose the version of the rust binary that you want to be downloaded/used
  `

module.exports = {
  description: 'Runs rust binary for subgraph testing',
  run: async toolbox => {
    // Obtain tools
    let { print } = toolbox

    // Read CLI parameters
    let { f, force, h, help, v, version } = toolbox.parameters.options
    let datasource = toolbox.parameters.first

    // Support both long and short option variants
    force = force || f
    help = help || h
    version = version || v

    // Show help text if requested
    if (help) {
      print.info(HELP)
      return
    }

    // console.log(toolbox);
    const platform = getPlatform();
    if (!version) {
      let xmlHttp = new XMLHttpRequest();
      xmlHttp.open('GET', 'https://api.github.com/repos/LimeChain/matchstick/releases/latest', false);
      xmlHttp.send();
      const jsonResponse = JSON.parse(xmlHttp.responseText);
      version = jsonResponse.tag_name;
    }

    const url = `https://github.com/LimeChain/matchstick/releases/download/${ version }/${ platform }`;

    let binary = new Binary(platform, url, version);
    await binary.install(force);
    binary.run(datasource);
  }
}

function getPlatform() {
  const type = os.type();
  const arch = os.arch();

  if (type === 'Windows_NT' && arch === 'x64') return 'binary-windows';
  if (type === 'Linux' && arch === 'x64') return 'binary-linux';
  if (type === 'Darwin' && arch === 'x64') return 'binary-macos';

  throw new Error(`Unsupported platform: ${type} ${arch}`);
}
