const fs = require('fs-extra')
const toolbox = require('gluegun/toolbox')
const yaml = require('js-yaml')

// Spec version to 0.0.2 uses top level templates. graph-cli no longer supports
// 0.0.1 which used nested templates.
module.exports = {
  name: 'Bump mapping specVersion from 0.0.1 to 0.0.2',
  predicate: async ({ sourceDir, manifestFile }) => {
    let manifest = yaml.safeLoad(fs.readFileSync(manifestFile, 'utf-8'))
    return (
      manifest &&
      typeof manifest === 'object' &&
      manifest.specVersion &&
      manifest.specVersion === '0.0.1'
    )
  },
  apply: async ({ manifestFile }) => {
    await toolbox.patching.replace(
      manifestFile,
      'specVersion: 0.0.1',
      'specVersion: 0.0.2',
    )
    await toolbox.patching.replace(
      manifestFile,
      "specVersion: '0.0.1'",
      "specVersion: '0.0.2'",
    )
    await toolbox.patching.replace(
      manifestFile,
      'specVersion: "0.0.1"',
      'specVersion: "0.0.2"',
    )
  },
}
