import { Args, Command, Flags } from '@oclif/core';
import { CLIError } from '@oclif/core/lib/errors';
import { system } from 'gluegun';
import immutable from 'immutable';
import {
  loadAbiFromBlockScout,
  loadAbiFromEtherscan,
  loadStartBlockForContract,
} from '../command-helpers/abi';
import * as DataSourcesExtractor from '../command-helpers/data-sources';
import { updateNetworksFile } from '../command-helpers/network';
import {
  generateDataSource,
  writeABI,
  writeMapping,
  writeSchema,
  writeTestsFiles,
} from '../command-helpers/scaffold';
import { withSpinner } from '../command-helpers/spinner';
import Protocol from '../protocols';
import EthereumABI from '../protocols/ethereum/abi';
import Subgraph from '../subgraph';

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
        'contract-name': contractName,
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

    let startBlock = startBlockFlag;

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
    } else if (network === 'poa-core') {
      ethabi = await loadAbiFromBlockScout(EthereumABI, network, address);
    } else {
      ethabi = await loadAbiFromEtherscan(EthereumABI, network, address);
    }

    try {
      startBlock ||= Number(await loadStartBlockForContract(network, address)).toString();
    } catch (error) {
      // If we can't get the start block, we'll just leave it out of the manifest
      // TODO: Ask the user for the start block
    }

    const { collisionEntities, onlyCollisions, abiData } = updateEventNamesOnCollision(
      ethabi,
      entities,
      contractName,
      mergeEntities,
    );
    ethabi.data = abiData;

    await writeABI(ethabi, contractName);
    await writeSchema(ethabi, protocol, result.getIn(['schema', 'file']) as any, collisionEntities);
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
    await updateNetworksFile(network, contractName, address, networksFile);

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
          throw new CLIError(
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
          dataRow.set('name', `${contractName}${dataRow.get('name')}`);
        }
      } else {
        onlyCollisions = false;
      }
    }
    abiData = abiData.asMutable().set(i, dataRow);
  }

  return { abiData, collisionEntities, onlyCollisions };
};
