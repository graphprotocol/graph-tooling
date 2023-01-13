import { URL } from 'url';
import * as toolbox from 'gluegun';
import ipfsHttpClient from 'ipfs-http-client';
import Compiler from '../compiler';
import Protocol from '../protocols';

interface CreateCompilerOptions {
  ipfs: any;
  headers?: any;
  outputDir: string;
  outputFormat: string;
  skipMigrations: boolean;
  blockIpfsMethods?: boolean;
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
  // Parse the IPFS URL
  let url;
  try {
    url = ipfs ? new URL(ipfs) : undefined;
  } catch (e) {
    toolbox.print.error(`Invalid IPFS URL: ${ipfs}
The IPFS URL must be of the following format: http(s)://host[:port]/[path]`);
    return null;
  }

  // Connect to the IPFS node (if a node address was provided)
  ipfs = ipfs
    ? ipfsHttpClient({
        protocol: url?.protocol.replace(/[:]+$/, ''),
        host: url?.hostname,
        port: url?.port,
        'api-path': url?.pathname.replace(/\/$/, '') + '/api/v0/',
        headers,
      })
    : undefined;

  return new Compiler({
    ipfs,
    subgraphManifest: manifest,
    outputDir,
    outputFormat,
    skipMigrations,
    blockIpfsMethods,
    protocol,
  });
}
