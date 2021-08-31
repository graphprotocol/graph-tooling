const { Binary } = require('binary-install-raw')
const { XMLHttpRequest } = require('xmlhttprequest')
const os = require('os')
const chalk = require('chalk')
const fetch = require('node-fetch')

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

    const platform = getPlatform();
    if (!version) {
      // let xmlHttp = new XMLHttpRequest();
      // xmlHttp.open('GET', 'https://api.github.com/repos/LimeChain/matchstick/releases/latest', false);
      // xmlHttp.send();
      let result = await fetch('https://api.github.com/repos/LimeChain/matchstick/releases/latest');
      let json = await result.json();
      const jsonResponse = JSON.parse(json.result);
      version = jsonResponse.tag_name;
      console.log(version);
    }

    const url = `https://github.com/LimeChain/matchstick/releases/download/${version}/${platform}`;

    let binary = new Binary(platform, url, version);
    await binary.install(force);
    binary.run(datasource);
  }
}

function getPlatform() {
  const type = os.type();
  const arch = os.arch();

  if (arch === 'x64') {
    if (type === 'Darwin') return 'binary-macos';
    if (type === 'Linux') return 'binary-linux';
    if (type === 'Windows_NT') return 'binary-windows';
  }

  throw new Error(`Unsupported platform: ${type} ${arch}`);
}
