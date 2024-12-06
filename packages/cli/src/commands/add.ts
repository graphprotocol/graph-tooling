import { filesystem, prompt, system } from 'gluegun';
import immutable from 'immutable';
import { Args, Command, Errors, Flags } from '@oclif/core';
import { NetworksRegistry } from '@pinax/graph-networks-registry';
import { ContractService } from '../command-helpers/contracts.js';
import * as DataSourcesExtractor from '../command-helpers/data-sources.js';
import { updateNetworksFile } from '../command-helpers/network.js';
import { retryWithPrompt } from '../command-helpers/retry.js';
import {
  generateDataSource,
  writeABI,
  writeMapping,
  writeSchema,
  writeTestsFiles,
} from '../command-helpers/scaffold.js';
import { withSpinner } from '../command-helpers/spinner.js';
import EthereumABI from '../protocols/ethereum/abi.js';
import Protocol from '../protocols/index.js';
import Subgraph from '../subgraph.js';

export default class AddCommand extends Command {
  static description = 'Adds a new datasource to a subgraph.';

  static args = {
    address: Args.string({
      description: 'The contract address',
      required: true,
    }),
    'subgraph-manifest': Args.string({
      default: 'subgraph.yaml',
    }),
  };

  static flags = {
    help: Flags.help({
      char: 'h',
    }),
    abi: Flags.string({
      summary: 'Path to the contract ABI.',
    }),
    'start-block': Flags.string({
      summary: 'The block number to start indexing events from.',
    }),
    'contract-name': Flags.string({
      summary: 'Name of the contract.',
      default: 'Contract',
    }),
    'merge-entities': Flags.boolean({
      summary: 'Whether to merge entities with the same name.',
      default: false,
    }),
    // TODO: should be networksFile (with an "s"), or?
    'network-file': Flags.file({
      summary: 'Networks config file path.',
      default: 'networks.json',
    }),
  };

  async run() {
    const {
      args: { address, 'subgraph-manifest': manifestPath },
      flags: {
        abi,
        'contract-name': contractNameFlag,
        'merge-entities': mergeEntities,
        'network-file': networksFile,
        'start-block': startBlockFlag,
      },
    } = await this.parse(AddCommand);

    const dataSourcesAndTemplates = await DataSourcesExtractor.fromFilePath(manifestPath);
    const protocol = Protocol.fromDataSources(dataSourcesAndTemplates);
    const manifest = await Subgraph.load(manifestPath, { protocol });
    const network = manifest.result.getIn(['dataSources', 0, 'network']) as any;
    const result = manifest.result.asMutable();
    const isLocalHost = network === 'localhost'; // This flag prevent Etherscan lookups in case the network selected is `localhost`
    let contractService: ContractService | undefined;

    if (isLocalHost) this.warn('`localhost` network detected, prompting user for inputs');
    else {
      const registry = await NetworksRegistry.fromLatestVersion();
      contractService = new ContractService(registry);
    }

    let startBlock = startBlockFlag;
    let contractName = contractNameFlag;

    const entities = getEntities(manifest);
    const contractNames = getContractNames(manifest);
    if (contractNames.includes(contractName)) {
      this.error(
        `Datasource or template with name ${contractName} already exists, please choose a different name.`,
        { exit: 1 },
      );
    }

    let ethabi = null;
    if (abi) {
      ethabi = EthereumABI.load(contractName, abi);
    } else {
      try {
        if (isLocalHost) throw Error; // Triggers user prompting without waiting for Etherscan lookup to fail

        ethabi = await retryWithPrompt(() =>
          withSpinner(
            'Fetching ABI from contract API...',
            'Failed to fetch ABI',
            'Warning fetching ABI',
            () => contractService?.getABI(EthereumABI, network, address),
          ),
        );
      } catch (error) {
        // we cannot ask user to do prompt in test environment
        if (process.env.NODE_ENV !== 'test') {
          const { abi: abiFromFile } = await prompt.ask<{ abi: EthereumABI }>([
            {
              type: 'input',
              name: 'abi',
              message: 'ABI file (path)',
              initial: ethabi,
              validate: async (value: string) => {
                try {
                  EthereumABI.load(contractName, value);
                  return true;
                } catch (e) {
                  this.error(e.message);
                }
              },
              result: async (value: string) => {
                try {
                  return EthereumABI.load(contractName, value);
                } catch (e) {
                  return e.message;
                }
              },
            },
          ]);
          ethabi = abiFromFile;
        }
      }
    }

    try {
      if (isLocalHost) throw Error; // Triggers user prompting without waiting for Etherscan lookup to fail

      startBlock ||= Number(await contractService?.getStartBlock(network, address)).toString();
    } catch (error) {
      // we cannot ask user to do prompt in test environment
      if (process.env.NODE_ENV !== 'test') {
        // If we can't get the start block, we'll just leave it out of the manifest
        const { startBlock: userInputStartBlock } = await prompt.ask<{ startBlock: string }>([
          {
            type: 'input',
            name: 'startBlock',
            message: 'Start Block',
            initial: '0',
            validate: value => parseInt(value) >= 0,
            result(value) {
              return value;
            },
          },
        ]);
        startBlock = userInputStartBlock;
      }
    }

    try {
      if (isLocalHost) throw Error; // Triggers user prompting without waiting for Etherscan lookup to fail

      contractName = (await contractService?.getContractName(network, address)) ?? '';
    } catch (error) {
      // not asking user to do prompt in test environment
      if (process.env.NODE_ENV !== 'test') {
        const { contractName: userInputContractName } = await prompt.ask<{ contractName: string }>([
          {
            type: 'input',
            name: 'contractName',
            message: 'Contract Name',
            initial: 'Contract',
            validate: value => value && value.length > 0,
            result(value) {
              return value;
            },
          },
        ]);
        contractName = userInputContractName;
      }
    }

    await writeABI(ethabi, contractName);

    const { collisionEntities, onlyCollisions, abiData } = updateEventNamesOnCollision(
      ethabi,
      entities,
      contractName,
      mergeEntities,
    );

    ethabi.data = abiData;

    await writeSchema(
      ethabi,
      protocol,
      result.getIn(['schema', 'file']) as any,
      collisionEntities,
      contractName,
    );
    await writeMapping(ethabi, protocol, contractName, collisionEntities);
    await writeTestsFiles(ethabi, protocol, contractName);

    const dataSources = result.get('dataSources');
    const dataSource = await generateDataSource(
      protocol,
      contractName,
      network,
      address,
      ethabi,
      startBlock,
    );

    // Handle the collisions edge case by copying another data source yaml data
    if (mergeEntities && onlyCollisions) {
      const firstDataSource = dataSources.get(0);
      const source = dataSource.get('source') as any;
      const mapping = firstDataSource.get('mapping').asMutable();

      // Save the address of the new data source
      source.abi = firstDataSource.get('source').get('abi');

      dataSource.set('mapping', mapping);
      dataSource.set('source', source);
    }

    result.set('dataSources', dataSources.push(dataSource));

    await Subgraph.write(result, manifestPath);

    // Update networks.json
    if (filesystem.exists(networksFile)) {
      await updateNetworksFile(network, contractName, address, networksFile);
    }

    // Detect Yarn and/or NPM
    const yarn = system.which('yarn');
    const npm = system.which('npm');
    if (!yarn && !npm) {
      this.error('Neither Yarn nor NPM were found on your system. Please install one of them.', {
        exit: 1,
      });
    }

    await withSpinner('Running codegen', 'Failed to run codegen', 'Warning during codegen', () =>
      system.run(yarn ? 'yarn codegen' : 'npm run codegen'),
    );
  }
}

const getEntities = (manifest: any) => {
  const dataSources = manifest.result.get('dataSources', immutable.List());
  const templates = manifest.result.get('templates', immutable.List());

  return dataSources
    .concat(templates)
    .map((dataSource: any) => dataSource.getIn(['mapping', 'entities']))
    .flatten();
};

const getContractNames = (manifest: any) => {
  const dataSources = manifest.result.get('dataSources', immutable.List());
  const templates = manifest.result.get('templates', immutable.List());

  return dataSources.concat(templates).map((dataSource: any) => dataSource.get('name'));
};

const updateEventNamesOnCollision = (
  ethabi: any,
  entities: any,
  contractName: string,
  mergeEntities: boolean,
) => {
  let abiData = ethabi.data;
  const collisionEntities = [];
  let onlyCollisions = true;

  for (let i = 0; i < abiData.size; i++) {
    const dataRow = abiData.get(i).asMutable();

    if (dataRow.get('type') === 'event') {
      if (entities.includes(dataRow.get('name'))) {
        if (entities.includes(`${contractName}${dataRow.get('name')}`)) {
          throw new Errors.CLIError(
            `Contract name ('${contractName}') + event name ('${dataRow.get(
              'name',
            )}') entity already exists.`,
            { exit: 1 },
          );
        }

        if (mergeEntities) {
          collisionEntities.push(dataRow.get('name'));
          abiData = abiData.asImmutable().delete(i); // needs to be immutable when deleting, yes you read that right - https://github.com/immutable-js/immutable-js/issues/1901
          i--; // deletion also shifts values to the left
          continue;
        } else {
          dataRow.set('collision', true);
        }
      } else {
        onlyCollisions = false;
      }
    }
    abiData = abiData.asMutable().set(i, dataRow);
  }

  return { abiData, collisionEntities, onlyCollisions };
};
