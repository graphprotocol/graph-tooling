import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { filesystem, prompt, system } from 'gluegun';
import { Args, Command, Flags } from '@oclif/core';
import {
  loadAbiFromBlockScout,
  loadAbiFromEtherscan,
  loadContractNameForAddress,
  loadStartBlockForContract,
} from '../command-helpers/abi.js';
import { appendApiVersionForGraph } from '../command-helpers/compiler.js';
import { DEFAULT_IPFS_URL } from '../command-helpers/ipfs.js';
import { initNetworksConfig } from '../command-helpers/network.js';
import { chooseNodeUrl, SUBGRAPH_STUDIO_URL } from '../command-helpers/node.js';
import { generateScaffold, writeScaffold } from '../command-helpers/scaffold.js';
import { sortWithPriority } from '../command-helpers/sort.js';
import { withSpinner } from '../command-helpers/spinner.js';
import { getSubgraphBasename } from '../command-helpers/subgraph.js';
import { GRAPH_CLI_SHARED_HEADERS } from '../constants.js';
import debugFactory from '../debug.js';
import EthereumABI from '../protocols/ethereum/abi.js';
import Protocol, { ProtocolName } from '../protocols/index.js';
import { abiEvents } from '../scaffold/schema.js';
import Schema from '../schema.js';
import { create, loadSubgraphSchemaFromIPFS } from '../utils.js';
import { validateContract } from '../validation/index.js';
import AddCommand from './add.js';

const protocolChoices = Array.from(Protocol.availableProtocols().keys());

const initDebugger = debugFactory('graph-cli:commands:init');

/**
 * a dynamic list of available networks supported by the studio
 */
const AVAILABLE_NETWORKS = async () => {
  const logger = initDebugger.extend('AVAILABLE_NETWORKS');
  try {
    logger('fetching chain_list from studio');
    const res = await fetch(SUBGRAPH_STUDIO_URL, {
      method: 'POST',
      headers: {
        ...GRAPH_CLI_SHARED_HEADERS,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'chain_list',
        params: [],
      }),
    });

    if (!res.ok) {
      logger(
        "Something went wrong while fetching 'chain_list' from studio HTTP code: %o",
        res.status,
      );
      return null;
    }

    const result = await res.json();
    if (result?.result) {
      logger('chain_list result: %o', result.result);
      return result.result as { studio: Array<string>; hostedService: Array<string> };
    }

    logger("Unable to get result for 'chain_list' from studio: %O", result);
    return null;
  } catch (e) {
    logger('error: %O', e);
    return null;
  }
};

const DEFAULT_EXAMPLE_SUBGRAPH = 'ethereum-gravatar';

export default class InitCommand extends Command {
  static description = 'Creates a new subgraph with basic scaffolding.';

  static args = {
    subgraphName: Args.string(),
    directory: Args.string(),
  };

  static flags = {
    help: Flags.help({
      char: 'h',
    }),

    protocol: Flags.string({
      options: protocolChoices,
    }),
    node: Flags.string({
      summary: 'Graph node for which to initialize.',
      char: 'g',
    }),
    'from-contract': Flags.string({
      description: 'Creates a scaffold based on an existing contract.',
      exclusive: ['from-example'],
    }),
    'from-example': Flags.string({
      description: 'Creates a scaffold based on an example subgraph.',
      // TODO: using a default sets the value and therefore requires not to have --from-contract
      // default: 'Contract',
      exclusive: ['from-contract'],
    }),

    'contract-name': Flags.string({
      helpGroup: 'Scaffold from contract',
      description: 'Name of the contract.',
      dependsOn: ['from-contract'],
    }),
    'index-events': Flags.boolean({
      helpGroup: 'Scaffold from contract',
      description: 'Index contract events as entities.',
      dependsOn: ['from-contract'],
    }),
    'skip-install': Flags.boolean({
      summary: 'Skip installing dependencies.',
      default: false,
    }),
    'skip-git': Flags.boolean({
      summary: 'Skip initializing a Git repository.',
      default: false,
      deprecated: {
        message:
          'In next major version, this flag will be removed. By default we will stop initializing a Git repository.',
      },
    }),
    'start-block': Flags.string({
      helpGroup: 'Scaffold from contract',
      description: 'Block number to start indexing from.',
      // TODO: using a default sets the value and therefore requires --from-contract
      // default: '0',
      dependsOn: ['from-contract'],
    }),

    abi: Flags.string({
      summary: 'Path to the contract ABI',
      // TODO: using a default sets the value and therefore requires --from-contract
      // default: '*Download from Etherscan*',
      dependsOn: ['from-contract'],
    }),
    spkg: Flags.string({
      summary: 'Path to the SPKG file',
    }),
    network: Flags.string({
      summary: 'Network the contract is deployed to.',
      description:
        'Check https://thegraph.com/docs/en/developing/supported-networks/ for supported networks',
      dependsOn: ['from-contract'],
    }),

    ipfs: Flags.string({
      summary: 'IPFS node to use for fetching subgraph data.',
      char: 'i',
      default: DEFAULT_IPFS_URL,
      hidden: true
    }),
  };

  async run() {
    const {
      args: { subgraphName, directory },
      flags,
    } = await this.parse(InitCommand);

    const {
      protocol,
      node: nodeFlag,
      'from-contract': fromContract,
      'contract-name': contractName,
      'from-example': fromExample,
      'index-events': indexEvents,
      'skip-install': skipInstall,
      'skip-git': skipGit,
      ipfs,
      network,
      abi: abiPath,
      'start-block': startBlock,
      spkg: spkgPath,
    } = flags;

    initDebugger('Flags: %O', flags);

    let { node } = chooseNodeUrl({
      node: nodeFlag,
    });

    if (fromContract && fromExample) {
      this.error('Only one of "--from-example" and "--from-contract" can be used at a time.', {
        exit: 1,
      });
    }

    // Detect git
    const git = system.which('git');
    if (!git) {
      this.error('Git was not found on your system. Please install "git" so it is in $PATH.', {
        exit: 1,
      });
    }

    // Detect Yarn and/or NPM
    const yarn = system.which('yarn');
    const npm = system.which('npm');
    if (!yarn && !npm) {
      this.error(`Neither Yarn nor NPM were found on your system. Please install one of them.`, {
        exit: 1,
      });
    }

    const commands = {
      link: yarn ? 'yarn link @graphprotocol/graph-cli' : 'npm link @graphprotocol/graph-cli',
      install: yarn ? 'yarn' : 'npm install',
      codegen: yarn ? 'yarn codegen' : 'npm run codegen',
      deploy: yarn ? 'yarn deploy' : 'npm run deploy',
    };

    // If all parameters are provided from the command-line,
    // go straight to creating the subgraph from the example
    if (fromExample && subgraphName && directory) {
      await initSubgraphFromExample.bind(this)(
        {
          fromExample,
          directory,
          subgraphName,
          skipInstall,
          skipGit,
        },
        { commands },
      );
      // Exit with success
      return this.exit(0);
    }

    // Will be assigned below if ethereum
    let abi!: EthereumABI;

    // If all parameters are provided from the command-line,
    // go straight to creating the subgraph from an existing contract
    if (fromContract && protocol && subgraphName && directory && network && node) {
      if (!protocolChoices.includes(protocol as ProtocolName)) {
        this.error(
          `Protocol '${protocol}' is not supported, choose from these options: ${protocolChoices.join(
            ', ',
          )}`,
          { exit: 1 },
        );
      }

      const protocolInstance = new Protocol(protocol as ProtocolName);

      if (protocolInstance.hasABIs()) {
        const ABI = protocolInstance.getABI();
        if (abiPath) {
          try {
            abi = loadAbiFromFile(ABI, abiPath);
          } catch (e) {
            this.error(`Failed to load ABI: ${e.message}`, { exit: 1 });
          }
        } else {
          try {
            if (network === 'poa-core') {
              abi = await loadAbiFromBlockScout(ABI, network, fromContract);
            } else {
              abi = await loadAbiFromEtherscan(ABI, network, fromContract);
            }
          } catch (e) {
            this.exit(1);
          }
        }
      }

      await initSubgraphFromContract.bind(this)(
        {
          protocolInstance,
          abi,
          directory,
          source: fromContract,
          indexEvents,
          network,
          subgraphName,
          contractName,
          node,
          startBlock,
          spkgPath,
          skipInstall,
          skipGit,
          ipfsUrl: ipfs,
        },
        { commands, addContract: false },
      );
      // Exit with success
      return this.exit(0);
    }

    if (fromExample) {
      const answers = await processFromExampleInitForm.bind(this)({
        subgraphName,
        directory,
      });

      if (!answers) {
        this.exit(1);
      }

      await initSubgraphFromExample.bind(this)(
        {
          fromExample,
          subgraphName: answers.subgraphName,
          directory: answers.directory,
          skipInstall,
          skipGit,
        },
        { commands },
      );
    } else {
      // Otherwise, take the user through the interactive form
      const answers = await processInitForm.bind(this)({
        protocol: protocol as ProtocolName | undefined,
        abi,
        abiPath,
        directory,
        source: fromContract,
        indexEvents,
        fromExample,
        network,
        subgraphName,
        contractName,
        startBlock,
        spkgPath,
        ipfsUrl: ipfs,
      });
      if (!answers) {
        this.exit(1);
      }

      ({ node } = chooseNodeUrl({
        node,
      }));
      await initSubgraphFromContract.bind(this)(
        {
          protocolInstance: answers.protocolInstance,
          subgraphName: answers.subgraphName,
          directory: answers.directory,
          abi: answers.abi,
          network: answers.network,
          source: answers.source,
          indexEvents: answers.indexEvents,
          contractName: answers.contractName,
          node,
          startBlock: answers.startBlock,
          spkgPath: answers.spkgPath,
          skipInstall,
          skipGit,
          ipfsUrl: answers.ipfs,
        },
        { commands, addContract: true },
      );
    }
    // Exit with success
    this.exit(0);
  }
}

async function processFromExampleInitForm(
  this: InitCommand,
  {
    directory: initDirectory,
    subgraphName: initSubgraphName,
  }: {
    directory?: string;
    subgraphName?: string;
  },
): Promise<
  | {
      subgraphName: string;
      directory: string;
    }
  | undefined
> {
  try {
    const { subgraphName } = await prompt.ask<{ subgraphName: string }>([
      {
        type: 'input',
        name: 'subgraphName',
        message: () => 'Subgraph slug',
        initial: initSubgraphName,
      },
    ]);

    const { directory } = await prompt.ask<{ directory: string }>([
      {
        type: 'input',
        name: 'directory',
        message: 'Directory to create the subgraph in',
        initial: () => initDirectory || getSubgraphBasename(subgraphName),
      },
    ]);

    return {
      subgraphName,
      directory,
    };
  } catch (e) {
    this.error(e, { exit: 1 });
  }
}

async function retryWithPrompt<T>(func: () => Promise<T>): Promise<T | undefined> {
  for (;;) {
    try {
      return await func();
    } catch (_) {
      const { retry } = await prompt.ask({
        type: 'confirm',
        name: 'retry',
        message: 'Do you want to retry?',
        initial: true,
      });

      if (!retry) {
        break;
      }
    }
  }
  return undefined;
}

async function processInitForm(
  this: InitCommand,
  {
    protocol: initProtocol,
    abi: initAbi,
    abiPath: initAbiPath,
    directory: initDirectory,
    source: initContract,
    indexEvents: initIndexEvents,
    fromExample: initFromExample,
    network: initNetwork,
    subgraphName: initSubgraphName,
    contractName: initContractName,
    startBlock: initStartBlock,
    spkgPath: initSpkgPath,
    ipfsUrl,
  }: {
    protocol?: ProtocolName;
    abi: EthereumABI;
    abiPath?: string;
    directory?: string;
    source?: string;
    indexEvents: boolean;
    fromExample?: string | boolean;
    network?: string;
    subgraphName?: string;
    contractName?: string;
    startBlock?: string;
    spkgPath?: string;
    ipfsUrl?: string;
  },
): Promise<
  | {
      abi: EthereumABI;
      protocolInstance: Protocol;
      subgraphName: string;
      directory: string;
      network: string;
      source: string;
      indexEvents: boolean;
      contractName: string;
      startBlock: string;
      fromExample: boolean;
      spkgPath: string | undefined;
      ipfs: string;
    }
  | undefined
> {
  let abiFromEtherscan: EthereumABI | undefined = undefined;
  let startBlockFromEtherscan: string | undefined = undefined;
  let contractNameFromEtherscan: string | undefined = undefined;

  try {
    const { protocol } = await prompt.ask<{ protocol: ProtocolName }>({
      type: 'select',
      name: 'protocol',
      message: 'Protocol',
      choices: protocolChoices,
      skip: protocolChoices.includes(String(initProtocol) as ProtocolName),
      result: value => {
        if (initProtocol) {
          initDebugger.extend('processInitForm')('initProtocol: %O', initProtocol);
          return initProtocol;
        }
        initDebugger.extend('processInitForm')('protocol: %O', value);
        return value;
      },
    });

    const protocolInstance = new Protocol(protocol);
    const isComposedSubgraph = protocolInstance.isComposedSubgraph();
    const isSubstreams = protocol === 'substreams';
    initDebugger.extend('processInitForm')('isSubstreams: %O', isSubstreams);

    const { subgraphName } = await prompt.ask<{ subgraphName: string }>([
      {
        type: 'input',
        name: 'subgraphName',
        message: 'Subgraph slug',
        initial: initSubgraphName,
      },
    ]);

    const { directory } = await prompt.ask<{ directory: string }>([
      {
        type: 'input',
        name: 'directory',
        message: 'Directory to create the subgraph in',
        initial: () => initDirectory || getSubgraphBasename(subgraphName),
      },
    ]);

    let choices = (await AVAILABLE_NETWORKS())?.['studio'];

    if (!choices) {
      this.error(
        'Unable to fetch available networks from API. Please report this issue. As a workaround you can pass `--network` flag from the available networks: https://thegraph.com/docs/en/developing/supported-networks',
        { exit: 1 },
      );
    }

    choices = sortWithPriority(choices, ['mainnet']);

    const { network } = await prompt.ask<{ network: string }>([
      {
        type: 'select',
        name: 'network',
        message: () => `${protocolInstance.displayName()} network`,
        choices,
        skip: initNetwork !== undefined,
        result: value => {
          if (initNetwork) {
            initDebugger.extend('processInitForm')('initNetwork: %O', initNetwork);
            return initNetwork;
          }
          initDebugger.extend('processInitForm')('network: %O', value);
          return value;
        },
      },
    ]);

    const sourceMessage = isComposedSubgraph
      ? 'Source subgraph identifier'
      : `Contract ${protocolInstance.getContract()?.identifierName()}`;

    const { source } = await prompt.ask<{ source: string }>([
      {
        type: 'input',
        name: 'source',
        message: sourceMessage,
        skip: () => !isComposedSubgraph,
        initial: initContract,
        validate: async (value: string) => {
          if (isComposedSubgraph) {
            return true;
          }

          if (initFromExample !== undefined || !protocolInstance.hasContract()) {
            return true;
          }

          const protocolContract = protocolInstance.getContract();
          if (!protocolContract) {
            return 'Contract not found.';
          }
          // Validate whether the contract is valid
          const { valid, error } = validateContract(value, protocolContract);

          return valid ? true : error;
        },
        result: async (value: string) => {
          if (initFromExample !== undefined || isSubstreams || initAbiPath || isComposedSubgraph) {
            initDebugger("value: '%s'", value);
            return value;
          }

          const ABI = protocolInstance.getABI();

          // Try loading the ABI from Etherscan, if none was provided
          if (protocolInstance.hasABIs() && !initAbi) {
            if (network === 'poa-core') {
              abiFromEtherscan = await retryWithPrompt(() =>
                loadAbiFromBlockScout(ABI, network, value),
              );
            } else {
              abiFromEtherscan = await retryWithPrompt(() =>
                loadAbiFromEtherscan(ABI, network, value),
              );
            }
          }
          // If startBlock is not set, try to load it.
          if (!initStartBlock) {
            // Load startBlock for this contract
            const startBlock = await retryWithPrompt(() =>
              loadStartBlockForContract(network, value),
            );
            if (startBlock) {
              startBlockFromEtherscan = Number(startBlock).toString();
            }
          }

          // If contract name is not set, try to load it.
          if (!initContractName) {
            // Load contract name for this contract
            const contractName = await retryWithPrompt(() =>
              loadContractNameForAddress(network, value),
            );
            if (contractName) {
              contractNameFromEtherscan = contractName;
            }
          }

          return value;
        },
      },
    ]);

    const { ipfs } = await prompt.ask<{ ipfs: string }>([
      {
        type: 'input',
        name: 'ipfs',
        message: `IPFS node to use for fetching subgraph manifest`,
        initial: ipfsUrl,
        skip: () => !isComposedSubgraph,
      },
    ]);

    const { spkg } = await prompt.ask<{ spkg: string }>([
      {
        type: 'input',
        name: 'spkg',
        message: 'SPKG file (path)',
        initial: () => initSpkgPath,
        skip: () => !isSubstreams || !!initSpkgPath,
        validate: value =>
          filesystem.exists(initSpkgPath || value) ? true : 'SPKG file does not exist',
      },
    ]);

    const { abi: abiFromFile } = await prompt.ask<{ abi: EthereumABI }>([
      {
        type: 'input',
        name: 'abi',
        message: 'ABI file (path)',
        initial: initAbiPath,
        skip: () =>
          !protocolInstance.hasABIs() ||
          initFromExample !== undefined ||
          abiFromEtherscan !== undefined ||
          isSubstreams ||
          !!initAbiPath ||
          isComposedSubgraph,
        validate: async (value: string) => {
          if (
            initFromExample ||
            abiFromEtherscan ||
            !protocolInstance.hasABIs() ||
            isComposedSubgraph
          ) {
            return true;
          }

          const ABI = protocolInstance.getABI();
          if (initAbiPath) value = initAbiPath;

          try {
            loadAbiFromFile(ABI, value);
            return true;
          } catch (e) {
            return e.message;
          }
        },
        result: async (value: string) => {
          if (
            initFromExample ||
            abiFromEtherscan ||
            !protocolInstance.hasABIs() ||
            isComposedSubgraph
          ) {
            return null;
          }

          const ABI = protocolInstance.getABI();
          if (initAbiPath) value = initAbiPath;

          try {
            return loadAbiFromFile(ABI, value);
          } catch (e) {
            return e.message;
          }
        },
      },
    ]);

    const { startBlock } = await prompt.ask<{ startBlock: string }>([
      {
        type: 'input',
        name: 'startBlock',
        message: 'Start Block',
        initial: initStartBlock || startBlockFromEtherscan || '0',
        skip: () => initFromExample !== undefined || isSubstreams,
        validate: value => parseInt(value) >= 0,
      },
    ]);

    const { contractName } = await prompt.ask<{ contractName: string }>([
      {
        type: 'input',
        name: 'contractName',
        message: 'Contract Name',
        initial: initContractName || contractNameFromEtherscan || 'Contract',
        skip: () =>
          initFromExample !== undefined || !protocolInstance.hasContract() || isSubstreams,
        validate: value => value && value.length > 0,
      },
    ]);

    const { indexEvents } = await prompt.ask<{ indexEvents: boolean }>([
      {
        type: 'confirm',
        name: 'indexEvents',
        message: 'Index contract events as entities',
        initial: true,
        skip: () => !!initIndexEvents || isSubstreams || isComposedSubgraph,
      },
    ]);

    return {
      abi: abiFromEtherscan || abiFromFile,
      protocolInstance,
      subgraphName,
      directory,
      startBlock,
      fromExample: !!initFromExample,
      network,
      contractName,
      source,
      indexEvents,
      spkgPath: spkg,
      ipfs,
    };
  } catch (e) {
    this.error(e, { exit: 1 });
  }
}

const loadAbiFromFile = (ABI: typeof EthereumABI, filename: string) => {
  const exists = filesystem.exists(filename);

  if (!exists) {
    throw Error('File does not exist.');
  } else if (exists === 'dir') {
    throw Error('Path points to a directory, not a file.');
  } else if (exists === 'other') {
    throw Error('Not sure what this path points to.');
  } else {
    return ABI.load('Contract', filename);
  }
};

// Inspired from: https://github.com/graphprotocol/graph-tooling/issues/1450#issuecomment-1713992618
async function isInRepo() {
  try {
    const result = await system.run('git rev-parse --is-inside-work-tree');
    // It seems like we are returning "true\n" instead of "true".
    // Don't think it is great idea to check for new line character here.
    // So best to just check if the result includes "true".
    return result.includes('true');
  } catch (err) {
    if (err.stderr.includes('not a git repository')) {
      return false;
    }
    throw Error(err.stderr);
  }
}

const initRepository = async (directory: string) =>
  await withSpinner(
    `Initialize subgraph repository`,
    `Failed to initialize subgraph repository`,
    `Warnings while initializing subgraph repository`,
    async () => {
      // Remove .git dir in --from-example mode; in --from-contract, we're
      // starting from an empty directory
      const gitDir = path.join(directory, '.git');
      if (filesystem.exists(gitDir)) {
        filesystem.remove(gitDir);
      }
      if (await isInRepo()) {
        await system.run('git add --all', { cwd: directory });
        await system.run('git commit -m "Initialize subgraph"', {
          cwd: directory,
        });
      } else {
        await system.run('git init', { cwd: directory });
        await system.run('git add --all', { cwd: directory });
        await system.run('git commit -m "Initial commit"', {
          cwd: directory,
        });
      }
      return true;
    },
  );

const installDependencies = async (
  directory: string,
  commands: {
    link: string;
    install: string;
  },
) =>
  await withSpinner(
    `Install dependencies with ${commands.install}`,
    `Failed to install dependencies`,
    `Warnings while installing dependencies`,
    async () => {
      if (process.env.GRAPH_CLI_TESTS) {
        await system.run(commands.link, { cwd: directory });
      }

      await system.run(commands.install, { cwd: directory });

      return true;
    },
  );

const runCodegen = async (directory: string, codegenCommand: string) =>
  await withSpinner(
    `Generate ABI and schema types with ${codegenCommand}`,
    `Failed to generate code from ABI and GraphQL schema`,
    `Warnings while generating code from ABI and GraphQL schema`,
    async () => {
      await system.run(codegenCommand, { cwd: directory });
      return true;
    },
  );

function printNextSteps(
  this: InitCommand,
  { subgraphName, directory }: { subgraphName: string; directory: string },
  {
    commands,
  }: {
    commands: {
      install: string;
      codegen: string;
      deploy: string;
    };
  },
) {
  const relativeDir = path.relative(process.cwd(), directory);

  // Print instructions
  this.log(
    `
Subgraph ${subgraphName} created in ${relativeDir}
`,
  );
  this.log(`Next steps:

  1. Run \`graph auth\` to authenticate with your deploy key.

  2. Type \`cd ${relativeDir}\` to enter the subgraph.

  3. Run \`${commands.deploy}\` to deploy the subgraph.

Make sure to visit the documentation on https://thegraph.com/docs/ for further information.`);
}

async function initSubgraphFromExample(
  this: InitCommand,
  {
    fromExample,
    subgraphName,
    directory,
    skipInstall,
    skipGit,
  }: {
    fromExample: string | boolean;
    subgraphName: string;
    directory: string;
    skipInstall: boolean;
    skipGit: boolean;
  },
  {
    commands,
  }: {
    commands: {
      link: string;
      install: string;
      codegen: string;
      deploy: string;
    };
  },
) {
  let overwrite = false;
  if (filesystem.exists(directory)) {
    overwrite = await prompt.confirm(
      'Directory already exists, do you want to initialize the subgraph here (files will be overwritten) ?',
      false,
    );

    if (!overwrite) {
      this.exit(1);
    }
  }

  // Clone the example subgraph repository
  const cloned = await withSpinner(
    `Cloning example subgraph`,
    `Failed to clone example subgraph`,
    `Warnings while cloning example subgraph`,
    async () => {
      // Create a temporary directory
      const prefix = path.join(os.tmpdir(), 'example-subgraph-');
      const tmpDir = fs.mkdtempSync(prefix);

      try {
        await system.run(`git clone https://github.com/graphprotocol/graph-tooling ${tmpDir}`);

        // If an example is not specified, use the default one
        if (fromExample === undefined || fromExample === true) {
          fromExample = DEFAULT_EXAMPLE_SUBGRAPH;
        }
        // Legacy purposes when everything existed in examples repo
        if (fromExample === 'ethereum/gravatar') {
          fromExample = DEFAULT_EXAMPLE_SUBGRAPH;
        }

        const exampleSubgraphPath = path.join(tmpDir, 'examples', String(fromExample));
        if (!filesystem.exists(exampleSubgraphPath)) {
          return { result: false, error: `Example not found: ${fromExample}` };
        }

        filesystem.copy(exampleSubgraphPath, directory, { overwrite });
        return true;
      } finally {
        filesystem.remove(tmpDir);
      }
    },
  );
  if (!cloned) {
    this.exit(1);
  }

  const networkConf = await initNetworksConfig(directory, 'address');
  if (networkConf !== true) {
    this.exit(1);
  }

  // Update package.json to match the subgraph name
  const prepared = await withSpinner(
    `Update subgraph name and commands in package.json`,
    `Failed to update subgraph name and commands in package.json`,
    `Warnings while updating subgraph name and commands in package.json`,
    async () => {
      try {
        // Load package.json
        const pkgJsonFilename = filesystem.path(directory, 'package.json');
        const pkgJson = await filesystem.read(pkgJsonFilename, 'json');

        pkgJson.name = getSubgraphBasename(subgraphName);
        for (const name of Object.keys(pkgJson.scripts)) {
          pkgJson.scripts[name] = pkgJson.scripts[name].replace('example', subgraphName);
        }
        delete pkgJson['license'];
        delete pkgJson['repository'];

        // Remove example's cli in favor of the local one (added via `npm link`)
        if (process.env.GRAPH_CLI_TESTS) {
          delete pkgJson['devDependencies']['@graphprotocol/graph-cli'];
        }

        // Write package.json
        filesystem.write(pkgJsonFilename, pkgJson, { jsonIndent: 2 });
        return true;
      } catch (e) {
        filesystem.remove(directory);
        this.error(`Failed to preconfigure the subgraph: ${e}`);
      }
    },
  );
  if (!prepared) {
    this.exit(1);
  }

  // Initialize a fresh Git repository
  if (!skipGit) {
    const repo = await initRepository(directory);
    if (repo !== true) {
      this.exit(1);
    }
  }

  // Install dependencies
  if (!skipInstall) {
    const installed = await installDependencies(directory, commands);
    if (installed !== true) {
      this.exit(1);
    }
  }

  // Run code-generation
  const codegen = await runCodegen(directory, commands.codegen);
  if (codegen !== true) {
    this.exit(1);
  }

  printNextSteps.bind(this)({ subgraphName, directory }, { commands });
}

async function initSubgraphFromContract(
  this: InitCommand,
  {
    protocolInstance,
    subgraphName,
    directory,
    abi,
    network,
    source,
    indexEvents,
    contractName,
    node,
    startBlock,
    spkgPath,
    skipInstall,
    skipGit,
    ipfsUrl,
  }: {
    protocolInstance: Protocol;
    subgraphName: string;
    directory: string;
    abi: EthereumABI;
    network: string;
    source: string;
    indexEvents: boolean;
    contractName?: string;
    node?: string;
    startBlock?: string;
    spkgPath?: string;
    skipInstall: boolean;
    skipGit: boolean;
    ipfsUrl: string;
  },
  {
    commands,
    addContract,
  }: {
    commands: {
      link: string;
      install: string;
      codegen: string;
      deploy: string;
    };
    addContract: boolean;
  },
) {
  const isSubstreams = protocolInstance.name === 'substreams';
  const isComposedSubgraph = protocolInstance.isComposedSubgraph();

  if (
    filesystem.exists(directory) &&
    !(await prompt.confirm(
      'Directory already exists, do you want to initialize the subgraph here (files will be overwritten) ?',
      false,
    ))
  ) {
    this.exit(1);
  }

  let entities: string[] | undefined;

  if (isComposedSubgraph) {
    try {
      const ipfsClient = create({
        url: appendApiVersionForGraph(ipfsUrl),
        headers: {
          ...GRAPH_CLI_SHARED_HEADERS,
        },
      });

      const schemaString = await loadSubgraphSchemaFromIPFS(ipfsClient, source);
      const schema = await Schema.loadFromString(schemaString);
      entities = schema.getEntityNames();
    } catch (e) {
      this.error(`Failed to load and parse subgraph schema: ${e.message}`, { exit: 1 });
    }
  }

  if (
    !protocolInstance.isComposedSubgraph() &&
    protocolInstance.hasABIs() &&
    (abiEvents(abi).size === 0 ||
      // @ts-expect-error TODO: the abiEvents result is expected to be a List, how's it an array?
      abiEvents(abi).length === 0)
  ) {
    // Fail if the ABI does not contain any events
    this.error(`ABI does not contain any events`, { exit: 1 });
  }

  // Scaffold subgraph
  const scaffold = await withSpinner(
    `Create subgraph scaffold`,
    `Failed to create subgraph scaffold`,
    `Warnings while creating subgraph scaffold`,
    async spinner => {
      const scaffold = await generateScaffold(
        {
          protocolInstance,
          subgraphName,
          abi,
          network,
          source,
          indexEvents,
          contractName,
          startBlock,
          node,
          spkgPath,
          entities,
        },
        spinner,
      );
      await writeScaffold(scaffold, directory, spinner);
      return true;
    },
  );
  if (scaffold !== true) {
    this.exit(1);
  }

  if (protocolInstance.hasContract()) {
    const identifierName = protocolInstance.getContract()!.identifierName();
    const networkConf = await initNetworksConfig(directory, identifierName);
    if (networkConf !== true) {
      this.exit(1);
    }
  }

  // Initialize a fresh Git repository
  if (!skipGit) {
    const repo = await initRepository(directory);
    if (repo !== true) {
      this.exit(1);
    }
  }

  if (!skipInstall) {
    // Install dependencies
    const installed = await installDependencies(directory, commands);
    if (installed !== true) {
      this.exit(1);
    }
  }

  // Substreams we have nothing to install or generate
  if (!isSubstreams) {
    // Run code-generation
    const codegen = await runCodegen(directory, commands.codegen);
    if (codegen !== true) {
      this.exit(1);
    }

    while (addContract) {
      addContract = await addAnotherContract.bind(this)({
        protocolInstance,
        directory,
      });
    }
  }

  printNextSteps.bind(this)({ subgraphName, directory }, { commands });
}

async function addAnotherContract(
  this: InitCommand,
  {
    protocolInstance,
    directory,
  }: {
    protocolInstance: Protocol;
    directory: string;
  },
) {
  const { addAnother } = await prompt.ask<{ addAnother: boolean }>([
    {
      type: 'confirm',
      name: 'addAnother',
      message: () => 'Add another contract? (y/n)',
      initial: false,
      required: true,
    },
  ]);

  if (addAnother) {
    const ProtocolContract = protocolInstance.getContract()!;

    let validContract = '';
    for (;;) {
      const { contract } = await prompt.ask<{ contract: string }>([
        {
          type: 'input',
          name: 'contract',
          message: () => `\nContract ${ProtocolContract.identifierName()}`,
          initial: ProtocolContract.identifierName(),
          required: true,
        },
      ]);
      const { valid, error } = validateContract(contract, ProtocolContract);
      if (valid) {
        validContract = contract;
        break;
      }
      this.log(`✖ ${error}`);
    }

    // Get the cwd before process.chdir in order to switch back in the end of command execution
    const cwd = process.cwd();

    try {
      if (fs.existsSync(directory)) {
        process.chdir(directory);
      }

      const commandLine = [validContract];

      await AddCommand.run(commandLine);
    } catch (e) {
      this.error(e);
    } finally {
      // TODO: safer way of doing this?
      process.chdir(cwd);
    }
  }

  return addAnother;
}
