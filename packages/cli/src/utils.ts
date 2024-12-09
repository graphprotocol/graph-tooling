import yaml from 'js-yaml';
import debug from './debug.js';

const utilsDebug = debug('graph-cli:utils');

export const create = (await import('kubo-rpc-client')).create;

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
