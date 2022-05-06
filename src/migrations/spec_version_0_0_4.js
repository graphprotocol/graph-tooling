const fs = require('fs-extra')
const toolbox = require('gluegun/toolbox')
const yaml = require('js-yaml')
const { loadManifest } = require('./util/load-manifest')

// Spec version 0.0.5 let event handlers require transaction receipt
// data to be accessed in the runtime.
module.exports = {
  name: 'Bump manifest specVersion from 0.0.4 to 0.0.5',
  predicate: async ({ sourceDir, manifestFile }) => {
    let manifest = await loadManifest(manifestFile)
    return (
      manifest &&
      typeof manifest === 'object' &&
      manifest.specVersion &&
      manifest.specVersion === '0.0.4'
    )
  },
  apply: async ({ manifestFile }) => {
    await toolbox.patching.patch(manifestFile, {
      insert: 'specVersion: 0.0.5',
      replace: new RegExp(`specVersion: ['"]?0.0.4['"]?`),
    })
  },
}
