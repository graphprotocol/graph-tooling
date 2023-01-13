import semver from 'semver';
import * as manifestUtil from '../migrations/util/load-manifest';
import * as graphTsUtil from '../migrations/util/versions';

export const assertManifestApiVersion = async (manifestPath: string, minimumApiVersion: string) => {
  const manifest = await manifestUtil.loadManifest(manifestPath);

  const lessThanMinimumVersion = (manifestApiVersion: string) =>
    semver.lt(manifestApiVersion, minimumApiVersion);

  let isLessThanMinimumVersion = false;

  if (manifest) {
    if (manifest.dataSources && Array.isArray(manifest.dataSources)) {
      isLessThanMinimumVersion = manifest.dataSources.some(
        (dataSource: any) =>
          dataSource?.mapping?.apiVersion && lessThanMinimumVersion(dataSource.mapping.apiVersion),
      );
    }

    if (manifest.templates && Array.isArray(manifest.templates)) {
      isLessThanMinimumVersion ||= manifest.templates.some(
        (template: any) =>
          template?.mapping?.apiVersion && lessThanMinimumVersion(template.mapping.apiVersion),
      );
    }
  }

  if (isLessThanMinimumVersion) {
    throw new Error(
      `The current version of graph-cli can't be used with mappings on apiVersion less than '${minimumApiVersion}'`,
    );
  }
};

export const assertGraphTsVersion = async (sourceDir: string, minimumGraphTsVersion: string) => {
  let graphTsVersion;
  try {
    graphTsVersion = await graphTsUtil.getGraphTsVersion(sourceDir);
  } catch (_) {
    // We only do the assertion if `graph-ts` is installed.
  }

  // Coerce needed because we may be dealing with an alpha version
  // and in the `semver` library, this would return true when comparing
  // the same version.
  if (graphTsVersion && semver.lt(semver.coerce(graphTsVersion)!, minimumGraphTsVersion)) {
    throw new Error(
      `To use this version of the graph-cli you must upgrade the graph-ts dependency to a version greater than or equal to ${minimumGraphTsVersion}
Also, you'll probably need to take a look at our AssemblyScript migration guide because of language breaking changes: https://thegraph.com/docs/developer/assemblyscript-migration-guide`,
    );
  }
};
