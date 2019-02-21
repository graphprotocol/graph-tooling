const keytar = require('keytar')
const toolbox = require('gluegun/toolbox')
const { normalizeNodeUrl } = require('./node')

const identifyAccessToken = async (node, accessToken) => {
  // Determine the access token to use, if any:
  // - First try using --access-token, if provided
  // - Then see if we have an access token set for the Graph node
  if (accessToken !== undefined) {
    return accessToken
  } else {
    try {
      node = normalizeNodeUrl(node)
      return await keytar.getPassword('graphprotocol-auth', node)
    } catch (e) {
      if (process.platform === 'win32') {
        toolbox.print.warning(
          `Could not get access token from Windows Credential Vault: ${e.message}`
        )
      } else if (process.platform === 'darwin') {
        toolbox.print.warning(
          `Could not get access token from macOS Keychain: ${e.message}`
        )
      } else if (process.platform === 'linux') {
        toolbox.print.warning(
          `Could not get access token from libsecret ` +
            `(usually gnome-keyring or ksecretservice): ${e.message}`
        )
      } else {
        toolbox.print.warning(
          `Could not get access token from OS secret storage service: ${e.message}`
        )
      }
      toolbox.print.info(`Continuing without an access token\n`)
    }
  }
}

module.exports = {
  identifyAccessToken,
}
