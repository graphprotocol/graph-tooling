import path from 'path';
import { filesystem, patching } from 'gluegun';
import yaml from 'yaml';
import { step, withSpinner } from './spinner';

export const updateSubgraphNetwork = async (
  manifest: any,
  network: string,
  networksFile: string,
  identifierName: string,
) =>
  await withSpinner(
    `Update sources network`,
    `Failed to update sources network`,
    `Warnings while updating sources network`,
    async spinner => {
      step(spinner, `Reading networks config`);
      const allNetworks = await filesystem.read(networksFile, 'json');
      const networkConfig = allNetworks[network];

      // Exit if the network passed with --network does not exits in networks.json
      if (!networkConfig) {
        throw new Error(`Network '${network}' was not found in '${networksFile}'`);
      }

      await patching.update(manifest, content => {
        const subgraph = yaml.parse(content);
        const networkSources = Object.keys(networkConfig);
        const subgraphSources = subgraph.dataSources.map((value: any) => value.name);

        // Update the dataSources network config
        subgraph.dataSources = subgraph.dataSources.map((source: any) => {
          if (!networkSources.includes(source.name)) {
            throw new Error(
              `'${source.name}' was not found in the '${network}' configuration, please update!`,
            );
          }

          if (hasChanges(identifierName, network, networkConfig[source.name], source)) {
            step(spinner, `Update '${source.name}' network configuration`);
            source.network = network;
            source.source = source.source.abi ? { abi: source.source.abi } : {};
            Object.assign(source.source, networkConfig[source.name]);
          } else {
            step(spinner, `Skip '${source.name}': No changes to network configuration`);
          }

          return source;
        });

        // All data sources shoud be on the same network,
        // so we have to update the network of all templates too.
        // eslint-disable-next-line -- prettier has problems with &&=
        subgraph.templates &&
          (subgraph.templates = subgraph.templates.map((template: any) => ({
            ...template,
            network,
          })));

        const unusedSources = networkSources.filter(x => !subgraphSources.includes(x));

        for (const source of unusedSources) {
          step(spinner, `dataSource '${source}' from '${networksFile}' not found in ${manifest}`);
        }

        const yaml_doc = new yaml.Document();
        yaml_doc.contents = subgraph;
        return yaml_doc.toString();
      });
    },
  );

export const initNetworksConfig = async (directory: string, identifierName: string) =>
  await withSpinner(
    `Initialize networks config`,
    `Failed to initialize networks config`,
    `Warnings while initializing networks config`,
    async () => {
      const subgraphStr = filesystem.read(path.join(directory, 'subgraph.yaml'));
      const subgraph = yaml.parse(subgraphStr!);

      const networks = subgraph.dataSources.reduce(
        (acc: any, source: any) =>
          Object.assign(acc, {
            [source.network]: {
              [source.name]: {
                [identifierName]: source.source.address,
                startBlock: source.source.startBlock,
              },
            },
          }),
        {},
      );

      filesystem.write(`${directory}/networks.json`, networks);

      return true;
    },
  );

// Checks if any network attribute has been changed
function hasChanges(identifierName: string, network: string, networkConfig: any, dataSource: any) {
  const networkChanged = dataSource.network !== network;

  // Return directly if the network is different
  if (networkChanged) return networkChanged;

  const addressChanged = networkConfig[identifierName] !== dataSource.source[identifierName];

  const startBlockChanged = networkConfig.startBlock !== dataSource.source.startBlock;

  return networkChanged || addressChanged || startBlockChanged;
}

export async function updateNetworksFile(
  network: string,
  dataSource: any,
  address: string,
  networksFile: string,
) {
  await patching.update(networksFile, config => {
    if (Object.keys(config).includes(network)) {
      Object.assign(config[network], { [dataSource]: { address } });
    } else {
      Object.assign(config, { [network]: { [dataSource]: { address } } });
    }
    return config;
  });
}
