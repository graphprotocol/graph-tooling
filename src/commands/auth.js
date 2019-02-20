const chalk = require('chalk')
const keytar = require('keytar')

const HELP = `
${chalk.bold('graph auth')} [options] ${chalk.bold('<node>')} ${chalk.bold(
  '<access-token>'
)}

${chalk.dim('Options:')}

  -h, --help                Show usage information
`

module.exports = {
  description: 'Sets the access token to use when deploying to a Graph node',
  run: async toolbox => {
    // Obtain tools
    let { filesystem, print, system } = toolbox

    // Read CLI parameters
    let { h, help, node } = toolbox.parameters.options
    let accessToken = toolbox.parameters.second

    // Show help text if requested
    if (h || help) {
      print.info(HELP)
      return
    }

    // Fail if no valid Graph node was provided
    if (!node) {
      print.error(`No Graph node provided`)
      print.info(HELP)
      process.exitCode = 1
      return
    }
    try {
      validateNodeUrl(node)
    } catch (e) {
      print.error(`Graph node "${node}" is invalid: ${e.message}`)
      process.exitCode = 1
      return
    }

    // Fail if no access token was provided
    if (!accessToken) {
      print.error(`No access token provided`)
      print.info(HELP)
      process.exitCode = 1
      return
    }
    if (accessToken.length > 200) {
      print.error(`Access token must not exceed 200 characters`)
      process.exitCode = 1
      return
    }

    try {
      node = normalizeNodeUrl(node)
      await keytar.setPassword('graphprotocol-auth', node, accessToken)
      print.success(`Access token set for ${node}`)
    } catch (e) {
      if (process.platform === 'win32') {
        print.error(`Error storing access token in Windows Credential Vault: ${e}`)
      } else if (process.platform === 'darwin') {
        print.error(`Error storing access token in macOS Keychain: ${e}`)
      } else if (process.platform === 'linux') {
        print.error(
          `Error storing access token with libsecret ` +
            `(usually gnome-keyring or ksecretservice): ${e}`
        )
      } else {
        print.error(`Error storing access token in OS secret storage service: ${e}`)
      }
      process.exitCode = 1
    }
  },
}
