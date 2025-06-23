import { URL } from 'node:url';
import * as toolbox from 'gluegun';
import Compiler from '../compiler/index.js';
import { GRAPH_CLI_SHARED_HEADERS } from '../constants.js';
import Protocol from '../protocols/index.js';
import { createIpfsClient } from '../utils.js';
import { getGraphIpfsUrl } from './ipfs.js';

interface CreateCompilerOptions {
  ipfs: string | URL | undefined;
  headers?: Headers | Record<string, string>;
  outputDir: string;
  outputFormat: string;
  skipMigrations: boolean;
  // TODO: Remove this is unused
  blockIpfsMethods?: RegExpMatchArray;
  protocol: Protocol;
}

// Helper function to construct a subgraph compiler
export function createCompiler(
  manifest: string,
  {
    ipfs,
    headers,
    outputDir,
    outputFormat,
    skipMigrations,
    blockIpfsMethods,
    protocol,
  }: CreateCompilerOptions,
) {
  // Validate the IPFS URL (if a node address was provided)
  try {
    if (ipfs && typeof ipfs === 'string') new URL(ipfs);
  } catch (e) {
    toolbox.print.error(`Invalid IPFS URL: ${ipfs}
The IPFS URL must be of the following format: http(s)://host[:port]/[path]`);
    return null;
  }

  // Connect to the IPFS node (if a node address was provided)
  const ipfsClient = ipfs
    ? createIpfsClient({
        url: getGraphIpfsUrl(ipfs.toString()).ipfsUrl,
        headers: {
          ...headers,
          ...GRAPH_CLI_SHARED_HEADERS,
        },
      })
    : undefined;

  return new Compiler({
    ipfs: ipfsClient,
    subgraphManifest: manifest,
    outputDir,
    outputFormat,
    skipMigrations,
    blockIpfsMethods,
    protocol,
  });
}
