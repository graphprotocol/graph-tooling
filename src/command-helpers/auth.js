const toolbox = require('gluegun/toolbox')
const { normalizeNodeUrl } = require('./node')

// keytar is listed as an optional dependency in package.json and
// dynamically required in this function
const requireKeytar = () => {
  try {
    return require('keytar')
  } catch (e) {
    throw new Error(
      `require(keytar) failed: ${e.message}. on linux, this is often` +
        `because of a missing libsecret dependency — try installing` +
        `libsecret and reinstalling graph-cli.`,
    )
  }
}

const identifyAccessToken = async (node, accessToken) => {
  // Determine the access token to use, if any:
  // - First try using --access-token, if provided
  // - Then see if we have an access token set for the Graph node
  if (accessToken !== undefined) {
    return accessToken
  } else {
    try {
      const keytar = requireKeytar()
      node = normalizeNodeUrl(node)
      return await keytar.getPassword('graphprotocol-auth', node)
    } catch (e) {
      if (process.platform === 'win32') {
        toolbox.print.warning(
          `Could not get access token from Windows Credential Vault: ${e.message}`,
        )
      } else if (process.platform === 'darwin') {
        toolbox.print.warning(
          `Could not get access token from macOS Keychain: ${e.message}`,
        )
      } else if (process.platform === 'linux') {
        toolbox.print.warning(
          `Could not get access token from libsecret ` +
            `(usually gnome-keyring or ksecretservice): ${e.message}`,
        )
      } else {
        toolbox.print.warning(
          `Could not get access token from OS secret storage service: ${e.message}`,
        )
      }
      toolbox.print.info(`Continuing without an access token\n`)
    }
  }
}

const saveAccessToken = async (node, accessToken) => {
  try {
    const keytar = requireKeytar()
    node = normalizeNodeUrl(node)
    await keytar.setPassword('graphprotocol-auth', node, accessToken)
  } catch (e) {
    if (process.platform === 'win32') {
      throw new Error(`Error storing access token in Windows Credential Vault: ${e}`)
    } else if (process.platform === 'darwin') {
      throw new Error(`Error storing access token in macOS Keychain: ${e}`)
    } else if (process.platform === 'linux') {
      throw new Error(
        `Error storing access token with libsecret ` +
          `(usually gnome-keyring or ksecretservice): ${e}`,
      )
    } else {
      throw new Error(`Error storing access token in OS secret storage service: ${e}`)
    }
  }
}

module.exports = {
  identifyAccessToken,
  saveAccessToken,
}
