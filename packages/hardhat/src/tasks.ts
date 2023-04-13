import path from 'path';
import * as YAML from 'yaml';
import * as toolbox from 'gluegun';
import { task, types } from 'hardhat/config';
import { compareAbiEvents } from './helpers/events';
import { parseName } from 'hardhat/utils/contract-names';
import { generateDockerCompose, generatePackageScripts } from './helpers/generator';
import { checkForRepo, initRepository, initGitignore } from './helpers/git';
import { initSubgraph, runCodegen, updateNetworksConfig, runGraphAdd } from './helpers/subgraph';

const Protocol = require('@graphprotocol/graph-cli/dist/protocols').default;
const Subgraph = require('@graphprotocol/graph-cli/dist/subgraph').default;
const { withSpinner, step } = require('@graphprotocol/graph-cli/dist/command-helpers/spinner');
const { initNetworksConfig } = require('@graphprotocol/graph-cli/dist/command-helpers/network');

task('graph', 'Wrapper task that will conditionally execute init, update or add.')
  .addOptionalPositionalParam('subtask', 'Specify which subtask to execute')
  .addParam('contractName', 'The name of the contract')
  .addParam('address', 'The address of the contract')
  .addOptionalParam('startBlock', 'The subgraph startBlock', undefined, types.int)
  .addFlag('mergeEntities', 'Whether the entities should be merged')
  .setAction(async (taskArgs, hre) => {
    const directory = hre.config.paths.subgraph;
    const manifestPath = path.join(directory, 'subgraph.yaml');
    const subgraph =
      toolbox.filesystem.exists(directory) == 'dir' &&
      toolbox.filesystem.exists(manifestPath) == 'file';
    let command = 'init';

    if (subgraph) {
      const protocol = new Protocol('ethereum');
      const manifest = await Subgraph.load(manifestPath, { protocol });
      let { contractName } = taskArgs;

      // If name is fully qualified, remove the source name
      // This is required to check if the dataSource already exists in the subgraph.yaml
      ({ contractName } = parseName(contractName));
      const dataSourcePresent = manifest.result
        .get('dataSources')
        .map((ds: any) => ds.get('name'))
        .contains(contractName);
      command = dataSourcePresent ? 'update' : 'add';
    }

    const { subtask, ...args } = taskArgs;
    if (command == 'add') args.abi = await getArtifactPath(hre, taskArgs.contractName);
    await hre.run(subtask || command, args);
  });

task('init', 'Initialize a subgraph')
  .addParam('contractName', 'The name of the contract')
  .addParam('address', 'The address of the contract')
  .addOptionalParam('startBlock', 'The subgraph startBlock', undefined, types.int)
  .setAction(async (taskArgs, hre) => {
    const directory = hre.config.paths.subgraph;
    const subgraphName = hre.config.subgraph.name;
    const network = hre.network.name || hre.config.defaultNetwork;

    if (
      toolbox.filesystem.exists(directory) == 'dir' &&
      toolbox.filesystem.exists(path.join(directory, 'subgraph.yaml')) == 'file'
    ) {
      toolbox.print.error(
        'Subgraph already exists! Please use the update subtask to update an existing subgraph!',
      );
      process.exit(1);
    }

    const scaffold = await initSubgraph(taskArgs, hre);
    if (scaffold !== true) {
      process.exit(1);
    }

    const networkConfig = await initNetworksConfig(directory, 'address');
    if (networkConfig !== true) {
      process.exit(1);
    }

    await updateNetworksConfig(
      toolbox,
      network,
      taskArgs.contractName,
      'startBlock',
      taskArgs.startBlock,
      directory,
    );

    const isGitRepo = await checkForRepo(toolbox);
    if (!isGitRepo) {
      const repo = await initRepository(toolbox);
      if (repo !== true) {
        process.exit(1);
      }
    }

    // Generate matchstick.yaml
    toolbox.filesystem.file('matchstick.yaml', {
      content: YAML.stringify({
        testsFolder: `${directory}/tests`,
        manifestPath: `${directory}/subgraph.yaml`,
      }),
    });

    // Generate scripts in package.json
    await generatePackageScripts(toolbox, subgraphName, directory);
    // Generate docker-compose.yaml
    await generateDockerCompose(toolbox);

    const gitignore = await initGitignore(toolbox, directory);
    if (gitignore !== true) {
      process.exit(1);
    }

    const codegen = await runCodegen(hre, directory);
    if (codegen !== true) {
      process.exit(1);
    }
  });

task('update', 'Updates an existing subgraph from artifact or contract address')
  .addParam('contractName', 'The name of the contract')
  .addParam('address', 'The address of the contract')
  .addOptionalParam('startBlock', 'The subgraph startBlock', undefined, types.int)
  .setAction(async (taskArgs, hre) => {
    const directory = hre.config.paths.subgraph;
    const network = hre.network.name || hre.config.defaultNetwork;
    const subgraph = toolbox.filesystem.read(path.join(directory, 'subgraph.yaml'), 'utf8');

    // If contractName is fully qualified, remove the source name
    const { contractName } = parseName(taskArgs.contractName);

    if (!toolbox.filesystem.exists(directory) || !subgraph) {
      toolbox.print.error('No subgraph found! Please first initialize a new subgraph!');
      process.exit(1);
    }

    await withSpinner(
      `Update subgraph dataSource ${contractName}`,
      `Failed to update subgraph dataSource ${contractName}`,
      `Warnings while updating subgraph dataSource ${contractName}`,
      async (spinner: any) => {
        step(spinner, `Fetching new contract version`);
        const artifact = await hre.artifacts.readArtifact(taskArgs.contractName);

        step(spinner, `Fetching current contract version from subgraph`);
        const manifest = YAML.parse(subgraph);

        const dataSource = manifest.dataSources.find(
          (source: { source: { abi: string } }) => source.source.abi == artifact.contractName,
        );
        const subgraphAbi = dataSource.mapping.abis.find(
          (abi: { name: string }) => abi.name == artifact.contractName,
        );
        const currentAbiJson = toolbox.filesystem.read(path.join(directory, subgraphAbi.file));

        if (!currentAbiJson) {
          toolbox.print.error(`Could not read ${path.join(directory, subgraphAbi.file)}`);
          process.exit(1);
        }

        step(spinner, `Updating contract ABI in subgraph`);
        toolbox.filesystem.write(path.join(directory, subgraphAbi.file), artifact.abi);

        step(spinner, `Updating contract's ${network} address in networks.json`);
        await updateNetworksConfig(
          toolbox,
          network,
          dataSource.name,
          'address',
          taskArgs.address,
          directory,
        );
        await updateNetworksConfig(
          toolbox,
          network,
          dataSource.name,
          'startBlock',
          taskArgs.startBlock,
          directory,
        );

        step(spinner, `Checking events for changes`);
        const eventsChanged = await compareAbiEvents(spinner, toolbox, dataSource, artifact.abi);

        if (!eventsChanged) {
          const codegen = await runCodegen(hre, directory);
          if (codegen !== true) {
            process.exit(1);
          }
        }
        return true;
      },
    );
  });

task('add', 'Add a dataSource to the project')
  .addParam('address', 'The address of the contract')
  .addFlag('mergeEntities', 'Whether the entities should be merged')
  .addOptionalParam('startBlock', 'The subgraph startBlock', undefined, types.int)
  .addOptionalParam('subgraphYaml', 'The location of the subgraph.yaml file', 'subgraph.yaml')
  .addOptionalParam('contractName', 'The name of the contract', 'Contract')
  .addOptionalParam('abi', 'Path to local abi file')
  .setAction(async (taskArgs, hre) => {
    const directory = hre.config.paths.subgraph;
    const subgraph = toolbox.filesystem.read(path.join(directory, taskArgs.subgraphYaml), 'utf8');
    const { contractName } = parseName(taskArgs.contractName);
    const network = hre.network.name || hre.config.defaultNetwork;

    if (!toolbox.filesystem.exists(directory) || !subgraph) {
      toolbox.print.error('No subgraph found! Please first initialize a new subgraph!');
      process.exit(1);
    }

    await withSpinner(
      `Add a new dataSource ${contractName}`,
      `Failed to add a new dataSource ${contractName}`,
      `Warnings while adding a new dataSource ${contractName}`,
      async (spinner: any) => {
        step(spinner, `Initiating graph add command`);
        await runGraphAdd(hre, taskArgs, directory);
        await updateNetworksConfig(
          toolbox,
          network,
          contractName,
          'startBlock',
          taskArgs.startBlock,
          directory,
        );

        return true;
      },
    );
  });

const getArtifactPath = async (hre: any, contractName: string): Promise<string> => {
  const artifact = await hre.artifacts.readArtifact(contractName);
  return path.join(
    hre.config.paths.artifacts,
    artifact.sourceName,
    `${artifact.contractName}.json`,
  );
};
