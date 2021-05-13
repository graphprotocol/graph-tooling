const toolbox = require('gluegun/toolbox')
const { normalizeNodeUrl } = require('./node')

// keytar is listed as an optional dependency in package.json and
// dynamically required in this function
const requireKeytar = () => {
  try {
    return require('keytar')
  } catch (e) {
    throw new Error(
      `

Cannot store the deploy key because dependencies are missing. If you
are on Linux, try installing 'libsecret-1-dev' (Debian, Ubuntu etc.) or
'libsecret-devel' (RedHat, Fedora etc.) and reinstalling Graph CLI
afterwards.

The original error was: ${e.message}
      `,
    )
  }
}

const identifyDeployKey = async (node, deployKey) => {
  // Determine the deploy key to use, if any:
  // - First try using --deploy-key, if provided
  // - Then see if we have an deploy key set for the Graph node
  if (deployKey !== undefined) {
    return deployKey
  } else {
    try {
      const keytar = requireKeytar()
      node = normalizeNodeUrl(node)
      return await keytar.getPassword('graphprotocol-auth', node)
    } catch (e) {
      if (process.platform === 'win32') {
        toolbox.print.warning(
          `Could not get deploy key from Windows Credential Vault: ${e.message}`,
        )
      } else if (process.platform === 'darwin') {
        toolbox.print.warning(
          `Could not get deploy key from macOS Keychain: ${e.message}`,
        )
      } else if (process.platform === 'linux') {
        toolbox.print.warning(
          `Could not get deploy key from libsecret ` +
            `(usually gnome-keyring or ksecretservice): ${e.message}`,
        )
      } else {
        toolbox.print.warning(
          `Could not get deploy key from OS secret storage service: ${e.message}`,
        )
      }
      toolbox.print.info(`Continuing without an deploy key\n`)
    }
  }
}

const saveDeployKey = async (node, deployKey) => {
  try {
    const keytar = requireKeytar()
    node = normalizeNodeUrl(node)
    await keytar.setPassword('graphprotocol-auth', node, deployKey)
  } catch (e) {
    if (process.platform === 'win32') {
      throw new Error(`Error storing deploy key in Windows Credential Vault: ${e}`)
    } else if (process.platform === 'darwin') {
      throw new Error(`Error storing deploy key in macOS Keychain: ${e}`)
    } else if (process.platform === 'linux') {
      throw new Error(
        `Error storing deploy key with libsecret ` +
          `(usually gnome-keyring or ksecretservice): ${e}`,
      )
    } else {
      throw new Error(`Error storing deploy key in OS secret storage service: ${e}`)
    }
  }
}

module.exports = {
  identifyDeployKey,
  saveDeployKey,
}
