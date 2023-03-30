/* eslint-disable */

import * as toolbox from 'gluegun';
import { loadManifest } from './util/load-manifest';

// Spec version 0.0.4 uses feature management, but features are
// detected and validated by the graph-node instance during subgraph
// deployment.
//
// Also, we skip spec version 0.0.3, which is considered invalid and
// non-canonical.
export default {
  name: 'Bump manifest specVersion from 0.0.2 to 0.0.4',
  predicate: async ({ manifestFile }: { manifestFile: string }) => {
    const manifest = await loadManifest(manifestFile);
    return (
      manifest &&
      typeof manifest === 'object' &&
      manifest.specVersion &&
      (manifest.specVersion === '0.0.2' || manifest.specVersion === '0.0.3')
    );
  },
  apply: async ({ manifestFile }: { manifestFile: string }) => {
    await toolbox.patching.patch(manifestFile, {
      insert: 'specVersion: 0.0.4',
      replace: new RegExp(`specVersion: ['"]?0.0.[23]['"]?`),
    });
  },
};
