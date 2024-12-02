import { URL } from 'url';
import * as toolbox from 'gluegun';
import Compiler from '../compiler/index.js';
import { GRAPH_CLI_SHARED_HEADERS } from '../constants.js';
import Protocol from '../protocols/index.js';

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

/**
 * Appends /api/v0 to the end of a The Graph IPFS URL
 */
export function appendApiVersionForGraph(inputString: string) {
  // Check if the input string is a valid The Graph IPFS URL
  const pattern = /^(https?:\/\/)?([\w-]+\.)+thegraph\.com\/ipfs\/?$/;
  if (pattern.test(inputString)) {
    // account for trailing slash
    if (inputString.endsWith('/')) {
      return inputString.slice(0, -1) + '/api/v0';
    }
    return inputString + '/api/v0';
  }
  return inputString;
}

// Helper function to construct a subgraph compiler
export async function createCompiler(
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

  const create = (await import('kubo-rpc-client')).create;
  // Connect to the IPFS node (if a node address was provided)
  const ipfsClient = ipfs
    ? create({
        url: appendApiVersionForGraph(ipfs.toString()),
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
