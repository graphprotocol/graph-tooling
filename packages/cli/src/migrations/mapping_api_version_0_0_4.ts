/* eslint-disable */

import * as toolbox from 'gluegun';
import semver from 'semver';
import { loadManifest } from './util/load-manifest';
import { getGraphTsVersion } from './util/versions';

// If any of the manifest apiVersions are 0.0.4, replace them with 0.0.5
export default {
  name: 'Bump mapping apiVersion from 0.0.4 to 0.0.5',
  predicate: async ({ sourceDir, manifestFile }: { sourceDir: string; manifestFile: string }) => {
    // Obtain the graph-ts version, if possible
    let graphTsVersion;
    try {
      graphTsVersion = await getGraphTsVersion(sourceDir);
    } catch (_) {
      // If we cannot obtain the version, return a hint that the graph-ts
      // hasn't been installed yet
      return 'graph-ts dependency not installed yet';
    }

    const manifest = await loadManifest(manifestFile);
    return (
      // Only migrate if the graph-ts version is >= 0.22.0...
      // Coerce needed because we may be dealing with an alpha version
      // and in the `semver` library this would not return true on equality.
      semver.gte(semver.coerce(graphTsVersion)!, '0.22.0') &&
      // ...and we have a manifest with mapping > apiVersion = 0.0.4
      manifest &&
      typeof manifest === 'object' &&
      Array.isArray(manifest.dataSources) &&
      (manifest.dataSources.reduce(
        (hasOldMappings: boolean, dataSource: any) =>
          hasOldMappings ||
          (typeof dataSource === 'object' &&
            dataSource.mapping &&
            typeof dataSource.mapping === 'object' &&
            dataSource.mapping.apiVersion === '0.0.4'),
        false,
      ) ||
        (Array.isArray(manifest.templates) &&
          manifest.templates.reduce(
            (hasOldMappings: boolean, template: any) =>
              hasOldMappings ||
              (typeof template === 'object' &&
                template.mapping &&
                typeof template.mapping === 'object' &&
                template.mapping.apiVersion === '0.0.4'),
            false,
          )))
    );
  },
  apply: async ({ manifestFile }: { manifestFile: string }) => {
    // Make sure we catch all variants; we could load the manifest
    // and replace the values in the data structures here; unfortunately
    // writing that back to the file messes with the formatting more than
    // we'd like; that's why for now, we use a simple patching approach
    await toolbox.patching.replace(
      manifestFile,
      // @ts-expect-error toolbox patching seems to accept RegExp
      new RegExp('apiVersion: 0.0.4', 'g'),
      'apiVersion: 0.0.5',
    );
    await toolbox.patching.replace(
      manifestFile,
      // @ts-expect-error toolbox patching seems to accept RegExp
      new RegExp("apiVersion: '0.0.4'", 'g'),
      "apiVersion: '0.0.5'",
    );
    await toolbox.patching.replace(
      manifestFile,
      // @ts-expect-error toolbox patching seems to accept RegExp
      new RegExp('apiVersion: "0.0.4"', 'g'),
      'apiVersion: "0.0.5"',
    );
  },
};
