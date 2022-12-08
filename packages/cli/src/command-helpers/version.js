import semver from 'semver'
import graphTsUtil from '../migrations/util/versions'
import manifestUtil from '../migrations/util/load-manifest'

const assertManifestApiVersion = async (manifestPath, minimumApiVersion) => {
  let manifest = await manifestUtil.loadManifest(manifestPath)

  let lessThanMinimumVersion = manifestApiVersion =>
    semver.lt(manifestApiVersion, minimumApiVersion)

  let isLessThanMinimumVersion = false

  if (manifest) {
    if (manifest.dataSources && Array.isArray(manifest.dataSources)) {
      isLessThanMinimumVersion = manifest.dataSources.some(
        dataSource =>
          dataSource &&
          dataSource.mapping &&
          dataSource.mapping.apiVersion &&
          lessThanMinimumVersion(dataSource.mapping.apiVersion),
      )
    }

    if (manifest.templates && Array.isArray(manifest.templates)) {
      isLessThanMinimumVersion =
        isLessThanMinimumVersion ||
        manifest.templates.some(
          template =>
            template &&
            template.mapping &&
            template.mapping.apiVersion &&
            lessThanMinimumVersion(template.mapping.apiVersion),
        )
    }
  }

  if (isLessThanMinimumVersion) {
    throw new Error(
      `The current version of graph-cli can't be used with mappings on apiVersion less than '${minimumApiVersion}'`,
    )
  }
}

const assertGraphTsVersion = async (sourceDir, minimumGraphTsVersion) => {
  let graphTsVersion
  try {
    graphTsVersion = await graphTsUtil.getGraphTsVersion(sourceDir)
  } catch (_) {
    // We only do the assertion if `graph-ts` is installed.
  }

  // Coerce needed because we may be dealing with an alpha version
  // and in the `semver` library, this would return true when comparing
  // the same version.
  if (graphTsVersion && semver.lt(semver.coerce(graphTsVersion), minimumGraphTsVersion)) {
    throw new Error(
      `To use this version of the graph-cli you must upgrade the graph-ts dependency to a version greater than or equal to ${minimumGraphTsVersion}
Also, you'll probably need to take a look at our AssemblyScript migration guide because of language breaking changes: https://thegraph.com/docs/developer/assemblyscript-migration-guide`,
    )
  }
}

export { assertManifestApiVersion, assertGraphTsVersion }
