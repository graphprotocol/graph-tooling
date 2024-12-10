import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NetworksRegistry } from '@pinax/graph-networks-registry';
import debugFactory from '../debug.js';

const debug = debugFactory('graph-cli:registry');

export async function loadRegistry() {
  let registry: NetworksRegistry;
  try {
    registry = await NetworksRegistry.fromLatestVersion();
    debug('loaded %O networks from latest registry', registry.networks.length);
  } catch (e) {
    debug('failed to load from latest: %O, trying from local file', e);
    try {
      registry = loadRegistryFromFile();
    } catch (e) {
      debug('failed to load from local file: %O', e);
      throw new Error(`Failed to load networks registry`);
    }
  }
  return registry;
}

export function loadRegistryFromFile() {
  const registryPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../config/TheGraphNetworksRegistry.json',
  );

  if (!fs.existsSync(registryPath)) {
    debug(`Registry file not found at ${registryPath}`);
    throw new Error(`Networks registry fallback file not found`);
  }

  const fileContents = fs.readFileSync(registryPath, 'utf8');
  const registry = NetworksRegistry.fromJson(fileContents);
  debug('loaded %O networks from local registry', registry.networks.length);
  return registry;
}
