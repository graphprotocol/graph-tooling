import chalk from 'chalk';
import { GluegunToolbox } from 'gluegun';
import immutable from 'immutable';
import { loadAbiFromBlockScout, loadAbiFromEtherscan } from '../command-helpers/abi';
import * as DataSourcesExtractor from '../command-helpers/data-sources';
import { fixParameters } from '../command-helpers/gluegun';
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

const HELP = `
${chalk.bold('graph add')} <address> [<subgraph-manifest default: "./subgraph.yaml">]

${chalk.dim('Options:')}

      --abi <path>              Path to the contract ABI (default: download from Etherscan)
      --contract-name           Name of the contract (default: Contract)
      --merge-entities          Whether to merge entities with the same name (default: false)
      --network-file <path>     Networks config file path (default: "./networks.json")
  -h, --help                    Show usage information
`;

export interface AddOptions {
  abi?: string;
  contractName?: string;
  mergeEntities?: boolean;
  networkFile?: string;
  help?: boolean;
}

export default {
  description: 'Adds a new datasource to a subgraph',
  run: async (toolbox: GluegunToolbox) => {
    // Obtain tools
    const { print, system } = toolbox;

    // Read CLI parameters
    let { abi, contractName, h, help, mergeEntities, networkFile } = toolbox.parameters.options;

    contractName ||= 'Contract';

    try {
      fixParameters(toolbox.parameters, {
        h,
        help,
        mergeEntities,
      });
    } catch (e) {
      print.error(e.message);
      process.exitCode = 1;
      return;
    }

    const address = toolbox.parameters.first || toolbox.parameters.array?.[0];
    const manifestPath =
      toolbox.parameters.second || toolbox.parameters.array?.[1] || './subgraph.yaml';

    // Show help text if requested
    if (help || h) {
      print.info(HELP);
      return;
    }

    // Validate the address
    if (!address) {
      print.error('No contract address provided');
      process.exitCode = 1;
      return;
    }

    const dataSourcesAndTemplates = await DataSourcesExtractor.fromFilePath(manifestPath);
    const protocol = Protocol.fromDataSources(dataSourcesAndTemplates);
    const manifest = await Subgraph.load(manifestPath, { protocol });
    const network = manifest.result.getIn(['dataSources', 0, 'network']) as any;
    const result = manifest.result.asMutable();

    const entities = getEntities(manifest);
    const contractNames = getContractNames(manifest);
    if (contractNames.includes(contractName)) {
      print.error(
        `Datasource or template with name ${contractName} already exists, please choose a different name`,
      );
      process.exitCode = 1;
      return;
    }

    let ethabi = null;
    if (abi) {
      ethabi = EthereumABI.load(contractName, abi);
    } else if (network === 'poa-core') {
      ethabi = await loadAbiFromBlockScout(EthereumABI, network, address);
    } else {
      ethabi = await loadAbiFromEtherscan(EthereumABI, network, address);
    }

    const { collisionEntities, onlyCollisions, abiData } = updateEventNamesOnCollision(
      toolbox,
      ethabi,
      entities,
      contractName,
      mergeEntities,
    );
    ethabi.data = abiData;

    await writeABI(ethabi, contractName);
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
    const dataSource = await generateDataSource(protocol, contractName, network, address, ethabi);

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
    const networksFile = networkFile || './networks.json';
    await updateNetworksFile(toolbox, network, contractName, address, networksFile);

    // Detect Yarn and/or NPM
    const yarn = system.which('yarn');
    const npm = system.which('npm');
    if (!yarn && !npm) {
      print.error(`Neither Yarn nor NPM were found on your system. Please install one of them.`);
      process.exitCode = 1;
      return;
    }

    await withSpinner(
      'Running codegen',
      'Failed to run codegen',
      'Warning during codegen',
      async () => {
        await system.run(yarn ? 'yarn codegen' : 'npm run codegen');
      },
    );
  },
};

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
  toolbox: GluegunToolbox,
  ethabi: any,
  entities: any,
  contractName: string,
  mergeEntities: boolean,
) => {
  let abiData = ethabi.data;
  const { print } = toolbox;
  const collisionEntities = [];
  let onlyCollisions = true;

  for (let i = 0; i < abiData.size; i++) {
    const dataRow = abiData.get(i).asMutable();

    if (dataRow.get('type') === 'event') {
      if (entities.includes(dataRow.get('name'))) {
        if (entities.includes(`${contractName}${dataRow.get('name')}`)) {
          print.error(`Contract name ('${contractName}')
            + event name ('${dataRow.get('name')}') entity already exists.`);
          process.exitCode = 1;
          break;
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
