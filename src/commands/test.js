const tmp = require('tmp-promise')
const { Binary } = require('binary-install')
const { XMLHttpRequest } = require('xmlhttprequest')
const os = require('os')

// Clean up temporary files even when an uncaught exception occurs
tmp.setGracefulCleanup()

module.exports = {
  description: 'Runs tests against a Graph Node environment (using Ganache by default)',
  run: async toolbox => {
    const platform = getPlatform();
    let xmlHttp = new XMLHttpRequest();
    xmlHttp.open('GET', 'https://api.github.com/repos/LimeChain/matchstick/releases/latest', false);
    xmlHttp.send();
    const jsonResponse = JSON.parse(xmlHttp.responseText);
    const version = jsonResponse.tag_name;
    const url = `https://github.com/LimeChain/matchstick/releases/download/0.1.0-no-test-text/${ platform }.tar.gz`;
    const name = 'matchstick';
    console.log(version)
    let binary = new Binary(name, url);
    binary.run();
    return binary;  
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
