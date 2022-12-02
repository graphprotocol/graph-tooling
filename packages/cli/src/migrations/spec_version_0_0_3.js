const fs = require('fs-extra')
const toolbox = require('gluegun/toolbox')
const yaml = require('js-yaml')
const { loadManifest } = require('./util/load-manifest')

// Spec version 0.0.4 uses feature management, but features are
// detected and validated by the graph-node instance during subgraph
// deployment.
//
// Also, we skip spec version 0.0.3, which is considered invalid and
// non-canonical.
module.exports = {
  name: 'Bump manifest specVersion from 0.0.2 to 0.0.4',
  predicate: async ({ sourceDir, manifestFile }) => {
    let manifest = await loadManifest(manifestFile)
    return (
      manifest &&
      typeof manifest === 'object' &&
      manifest.specVersion &&
      (manifest.specVersion === '0.0.2' || manifest.specVersion === '0.0.3')
    )
  },
  apply: async ({ manifestFile }) => {
    await toolbox.patching.patch(manifestFile, {
      insert: 'specVersion: 0.0.4',
      replace: new RegExp(`specVersion: ['"]?0.0.[23]['"]?`),
    })
  },
}
