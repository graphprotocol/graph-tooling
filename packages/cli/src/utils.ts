import yaml from 'js-yaml';
import debug from './debug.js';

const utilsDebug = debug('graph-cli:utils');

export const createIpfsClient = (await import('kubo-rpc-client')).create;

export async function loadSubgraphSchemaFromIPFS(ipfsClient: any, manifest: string) {
  try {
    const manifestBuffer = ipfsClient.cat(manifest);
    let manifestFile = '';
    for await (const chunk of manifestBuffer) {
      manifestFile += Buffer.from(chunk).toString('utf8'); // Explicitly convert each chunk to UTF-8
    }

    const manifestYaml: any = yaml.load(manifestFile);
    let schema = manifestYaml.schema.file['/'];

    if (schema.startsWith('/ipfs/')) {
      schema = schema.slice(6);
    }

    const schemaBuffer = ipfsClient.cat(schema);
    let schemaFile = '';
    for await (const chunk of schemaBuffer) {
      schemaFile += Buffer.from(chunk).toString('utf8'); // Explicitly convert each chunk to UTF-8
    }
    return schemaFile;
  } catch (e) {
    utilsDebug.extend('loadSubgraphSchemaFromIPFS')(`Failed to load schema from IPFS ${manifest}`);
    utilsDebug.extend('loadSubgraphSchemaFromIPFS')(e);
    throw Error(`Failed to load schema from IPFS ${manifest}`);
  }
}

export async function loadManifestFromIPFS(ipfsClient: any, manifest: string) {
  try {
    const manifestBuffer = ipfsClient.cat(manifest);
    let manifestFile = '';
    for await (const chunk of manifestBuffer) {
      manifestFile += Buffer.from(chunk).toString('utf8');
    }
    return manifestFile;
  } catch (e) {
    utilsDebug.extend('loadManifestFromIPFS')(`Failed to load manifest from IPFS ${manifest}`);
    utilsDebug.extend('loadManifestFromIPFS')(e);
    throw Error(`Failed to load manifest from IPFS ${manifest}`);
  }
}

/**
 * Validates that the network of a source subgraph matches the target network
 * @param ipfsClient IPFS client instance
 * @param sourceSubgraphId IPFS hash of the source subgraph
 * @param targetNetwork Network of the target subgraph being created
 * @returns Object containing validation result and error message if any
 */
export async function validateSubgraphNetworkMatch(
  ipfsClient: any,
  sourceSubgraphId: string,
  targetNetwork: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const manifestFile = await loadManifestFromIPFS(ipfsClient, sourceSubgraphId);
    const manifestYaml = yaml.load(manifestFile) as any;

    // Extract network from data sources
    const dataSources = manifestYaml.dataSources || [];
    const templates = manifestYaml.templates || [];
    const allSources = [...dataSources, ...templates];

    if (allSources.length === 0) {
      return { valid: true }; // No data sources to validate
    }

    // Get network from first data source
    const sourceNetwork = allSources[0].network;

    if (sourceNetwork !== targetNetwork) {
      return {
        valid: false,
        error: `Network mismatch: The source subgraph is indexing the '${sourceNetwork}' network, but you're creating a subgraph for '${targetNetwork}' network. When composing subgraphs, they must index the same network.`,
      };
    }

    return { valid: true };
  } catch (e) {
    utilsDebug.extend('validateSubgraphNetworkMatch')(`Failed to validate network match: ${e}`);
    return {
      valid: false,
      error: e instanceof Error ? e.message : 'Failed to validate subgraph network',
    };
  }
}
