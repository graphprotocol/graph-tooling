const semver = require('semver')
const graphTsUtil = require('../migrations/util/versions')
const manifestUtil = require('../migrations/util/load-manifest')

const assertManifestApiVersion = async (manifestPath, minimumApiVersion) => {
  let manifest = await manifestUtil.loadManifest(manifestPath)

  let lessThanMinimumVersion = manifestApiVersion =>
    semver.lt(
      manifestApiVersion,
      minimumApiVersion,
    )

  let isLessThanMinimumVersion = false

  if (manifest) {
    if (manifest.dataSources && Array.isArray(manifest.dataSources)) {
      isLessThanMinimumVersion = manifest.dataSources.some(
        dataSource =>
          dataSource &&
          dataSource.mapping &&
          dataSource.mapping.apiVersion &&
          lessThanMinimumVersion(dataSource.mapping.apiVersion)
      )
    }

    if (manifest.templates && Array.isArray(manifest.templates)) {
      isLessThanMinimumVersion = isLessThanMinimumVersion ||
        manifest.templates.some(
          template =>
            template &&
            template.mapping &&
            template.mapping.apiVersion &&
            lessThanMinimumVersion(template.mapping.apiVersion)
        )
    }
  }

  if (isLessThanMinimumVersion) {
    throw new Error(
      `The current version of graph-cli can't be used with mappings on apiVersion less than '${minimumApiVersion}'`
    )
  }
}

const assertGraphTsVersion = async (sourceDir, minimumGraphTsVersion) => {
  let graphTsVersion
  try {
    graphTsVersion = await graphTsUtil.getGraphTsVersion(sourceDir)
  } catch (_) {
    // We don't throw here yet because the 'validation' tests don't install
    // the dependencies, so they break here.
    //
    // TODO: uncomment the throw below after making validation tests
    // don't break for not having package.json dependencies installed.
    // Also remove .skip in test 0489e986-f0b6-419f-b9c0-eda21bab47c3
    //
    // // throw new Error("graph-ts dependency not installed yet")
  }

  if (graphTsVersion && semver.lt(graphTsVersion, minimumGraphTsVersion)) {
    throw new Error(
      `To use this version of the graph-cli you must upgrade the graph-ts dependency to a version greater than or equal to ${minimumGraphTsVersion}
Also, you'll probably need to take a look at our AssemblyScript migration guide because of language breaking changes: https://gist.github.com/otaviopace/8406cb39644d2e7678570d1e7f50dac4`
    )
  }
}

module.exports = {
  assertManifestApiVersion,
  assertGraphTsVersion,
}
