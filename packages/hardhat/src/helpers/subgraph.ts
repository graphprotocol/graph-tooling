import path from 'path';
import { fromJS } from 'immutable';
import { fromDirectory } from './execution';
import { parseName } from 'hardhat/utils/contract-names';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const CodegenCommand = require('@graphprotocol/graph-cli/dist/commands/codegen').default;
const BuildCommand = require('@graphprotocol/graph-cli/dist/commands/build').default;
const AddCommand = require('@graphprotocol/graph-cli/dist/commands/add').default;
const Protocol = require('@graphprotocol/graph-cli/dist/protocols').default;
const { chooseNodeUrl } = require('@graphprotocol/graph-cli/dist/command-helpers/node');
const { withSpinner } = require('@graphprotocol/graph-cli/dist/command-helpers/spinner');
const {
  generateScaffold,
  writeScaffold,
} = require('@graphprotocol/graph-cli/dist/command-helpers/scaffold');

const AVAILABLE_PRODUCTS = ['subgraph-studio', 'hosted-service'];

export const initSubgraph = async (
  taskArgs: { contractName: string; address: string },
  hre: HardhatRuntimeEnvironment,
): Promise<boolean> =>
  await withSpinner(
    `Create subgraph scaffold`,
    `Failed to create subgraph scaffold`,
    `Warnings while creating subgraph scaffold`,
    async (spinner: any) => {
      const { contractName, address } = taskArgs;
      const subgraphPath = hre.config.paths.subgraph!;
      const network = hre.network.name || hre.config.defaultNetwork;
      const { name, product, indexEvents } = hre.config.subgraph!;

      const { node, allowSimpleName } = chooseNodeUrl({
        product,
        allowSimplename: hre.config.subgraph!.allowSimpleName,
      });

      validateSubgraphName(name!, allowSimpleName);
      validateProduct(product!);

      const protocolInstance = new Protocol('ethereum');
      const ABI = protocolInstance.getABI();
      const artifact = await hre.artifacts.readArtifact(contractName);
      const abi = new ABI(artifact.contractName, undefined, fromJS(artifact.abi));

      const scaffold = await generateScaffold(
        {
          protocolInstance,
          network,
          subgraphName: name,
          abi,
          contract: address,
          contractName: artifact.contractName,
          indexEvents,
          node,
        },
        spinner,
      );

      await writeScaffold(scaffold, subgraphPath, spinner);

      return true;
    },
  );

export const updateNetworksConfig = async (
  toolbox: any,
  network: string,
  dataSource: string,
  identifier: string,
  value: string | number,
  directory: string,
): Promise<void> => {
  await toolbox.patching.update(path.join(directory, 'networks.json'), (config: any) => {
    if (Object.prototype.hasOwnProperty.call(config, network)) {
      if (Object.prototype.hasOwnProperty.call(config[network], dataSource)) {
        Object.assign(config[network][dataSource], { [identifier]: value });
      } else {
        Object.assign(config[network], { [dataSource]: { [identifier]: value } });
      }
    } else {
      Object.assign(config, { [network]: { [dataSource]: { [identifier]: value } } });
    }
    return config;
  });
};

export const runCodegen = async (
  hre: HardhatRuntimeEnvironment,
  directory: string,
): Promise<boolean> =>
  await fromDirectory(hre, directory, async () => {
    await CodegenCommand.run([]);

    return true;
  });

export const runBuild = async (
  hre: HardhatRuntimeEnvironment,
  network: string,
  directory: string,
): Promise<boolean> =>
  await fromDirectory(hre, directory, async () => {
    await BuildCommand.run(['--network', network]);

    return true;
  });

export const runGraphAdd = async (
  hre: HardhatRuntimeEnvironment,
  taskArgs: {
    contractName: string;
    address: string;
    mergeEntities: boolean;
    abi: string;
    subgraphYaml: string;
  },
  directory: string,
): Promise<boolean> =>
  await fromDirectory(hre, directory, async () => {
    const { abi, address, mergeEntities, subgraphYaml } = taskArgs;

    const { contractName } = parseName(taskArgs.contractName);
    const commandLine = [address, '--contract-name', contractName];

    if (subgraphYaml.includes(directory)) {
      commandLine.push(path.normalize(subgraphYaml.replace(directory, '')));
    } else {
      commandLine.push(subgraphYaml);
    }

    if (mergeEntities) {
      commandLine.push('--merge-entities');
    }

    if (abi) {
      if (abi.includes(directory)) {
        commandLine.push('--abi', path.normalize(abi.replace(directory, '')));
      } else {
        commandLine.push('--abi', abi);
      }
    }

    await AddCommand.run(commandLine);

    return true;
  });

const validateSubgraphName = (name: string, allowSimpleName: boolean | undefined): void => {
  if (name.split('/').length !== 2 && !allowSimpleName) {
    throw new Error(
      `Subgraph name "${name}" needs to have the format "<PREFIX>/${name}".
When using the Hosted Service at https://thegraph.com, <PREFIX> is the
name of your GitHub user or organization. You can configure the name in the hardhat.config:

module.exports = {
  ...
  subgraph: {
    ...
    product: 'hosted-service',
    name: '<PREFIX>/${name}',
    ...
  },
}

Or you can bypass this check by setting allowSimpleName to true in the hardhat.config:
module.exports = {
  ...
  subgraph: {
    ...
    product: 'hosted-service',
    allowSimpleName: true,
    ...
  },
}`,
    );
  }
};

export const validateProduct = (product: string): void => {
  if (!AVAILABLE_PRODUCTS.includes(product)) {
    throw new Error(
      `Unsupported product ${product}. Currently available products are ${AVAILABLE_PRODUCTS.join(
        ' and ',
      )}`,
    );
  }
};
