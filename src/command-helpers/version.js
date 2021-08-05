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

  if (manifest && manifest.dataSources) {
    isLessThanMinimumVersion = manifest.dataSources.some(
      dataSource =>
        dataSource &&
          dataSource.mapping &&
          dataSource.mapping.apiVersion &&
          lessThanMinimumVersion(dataSource.mapping.apiVersion)
    )
  }

  if (manifest && manifest.templates) {
    isLessThanMinimumVersion = isLessThanMinimumVersion || 
      manifest.templates.some(
        template =>
          template &&
            template.mapping &&
            template.mapping.apiVersion &&
            lessThanMinimumVersion(template.mapping.apiVersion)
      )
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
    // If we cannot obtain the version, throw an error informing
    // that the graph-ts hasn't been installed yet.
    throw new Error("graph-ts dependency not installed yet")
  }

  if (semver.lt(graphTsVersion, minimumGraphTsVersion)) {
    throw new Error(
      `To use this version of the graph-cli you must upgrade the graph-ts dependency to a version greater than or equal to ${minimumGraphTsVersion}
Also, you'll probably need to take a look at our AssemblyScript migration guide because of language breaking changes: https://thegraph.com/docs/assemblyscript-migration-guide`
    )
  }
}

module.exports = {
  assertManifestApiVersion,
  assertGraphTsVersion,
}
