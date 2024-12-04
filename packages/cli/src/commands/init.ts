import fs from 'fs';
import os from 'os';
import path from 'path';
import { filesystem, prompt, system } from 'gluegun';
import { Args, Command, Flags } from '@oclif/core';
import { Network, NetworksRegistry } from '@pinax/graph-networks-registry';
import { appendApiVersionForGraph } from '../command-helpers/compiler.js';
import { ContractService } from '../command-helpers/contracts.js';
import { resolveFile } from '../command-helpers/file-resolver.js';
import { DEFAULT_IPFS_URL } from '../command-helpers/ipfs.js';
import { initNetworksConfig } from '../command-helpers/network.js';
import { chooseNodeUrl } from '../command-helpers/node.js';
import { PromptManager } from '../command-helpers/prompt-manager.js';
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
        'Refer to https://github.com/graphprotocol/networks-registry/ for supported networks',
      dependsOn: ['from-contract'],
    }),

    ipfs: Flags.string({
      summary: 'IPFS node to use for fetching subgraph data.',
      char: 'i',
      default: DEFAULT_IPFS_URL,
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
      const registry = await NetworksRegistry.fromLatestVersion();
      const contractService = new ContractService(registry);

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
            abi = await contractService.getABI(ABI, network, fromContract);
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
        abi,
        abiPath,
        directory,
        source: fromContract,
        indexEvents,
        fromExample,
        subgraphName,
        contractName,
        startBlock,
        spkgPath,
        ipfsUrl: ipfs,
      });
      if (!answers) {
        this.exit(1);
      }

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
      if (answers.cleanup) {
        answers.cleanup();
      }
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
    abi: initAbi,
    abiPath: initAbiPath,
    directory: initDirectory,
    source: initContract,
    indexEvents: initIndexEvents,
    fromExample: initFromExample,
    subgraphName: initSubgraphName,
    contractName: initContractName,
    startBlock: initStartBlock,
    spkgPath: initSpkgPath,
    ipfsUrl,
  }: {
    abi: EthereumABI;
    abiPath?: string;
    directory?: string;
    source?: string;
    indexEvents: boolean;
    fromExample?: string | boolean;
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
      cleanup: (() => void) | undefined;
    }
  | undefined
> {
  try {
    const registry = await NetworksRegistry.fromLatestVersion();
    const contractService = new ContractService(registry);

    const networks = sortWithPriority(
      registry.networks,
      n => n.issuanceRewards,
      (a, b) => registry.networks.indexOf(a) - registry.networks.indexOf(b),
    );

    const networkToChoice = (n: Network) => ({
      name: n.id,
      value: `${n.id}:${n.shortName}:${n.fullName}`.toLowerCase(),
      hint: n.id,
      message: `${n.fullName}`,
    });

    const formatChoices = (choices: ReturnType<typeof networkToChoice>[]) => {
      const shown = choices.slice(0, 20);
      const remaining = networks.length - shown.length;
      if (remaining == 0) return shown;
      return [
        ...shown,
        {
          name: ``,
          disabled: true,
          hint: '',
          message: `  < ${remaining} more >`,
        },
      ];
    };

    let network: Network = networks[0];
    let protocolInstance: Protocol = new Protocol('ethereum');
    let isComposedSubgraph = false;
    let isSubstreams = false;
    let subgraphName = initSubgraphName ?? '';
    let directory = initDirectory;
    let ipfsNode: string = '';
    let source = initContract;
    let contractName = initContractName;
    let abiFromFile: EthereumABI | undefined = undefined;
    let abiFromApi: EthereumABI | undefined = undefined;
    let startBlock: string | undefined = undefined;
    let spkgPath: string | undefined;
    let spkgCleanup: (() => void) | undefined;
    let indexEvents = initIndexEvents;

    const promptManager = new PromptManager();

    promptManager.addStep({
      type: 'autocomplete',
      name: 'networkId',
      required: true,
      message: 'Network',
      choices: formatChoices(networks.map(networkToChoice)),
      format: value => `${value}`,
      suggest: (input, _) =>
        formatChoices(
          networks
            .map(networkToChoice)
            .filter(({ value }) => (value ?? '').includes(input.toLowerCase())),
        ),
      validate: value => (networks.find(n => n.id === value) ? true : 'Pick a network'),
      result: value => {
        initDebugger.extend('processInitForm')('networkId: %O', value);
        network = networks.find(n => n.id === value)!;
        return value;
      },
    });

    promptManager.addStep({
      type: 'select',
      name: 'protocol',
      message: 'Source',
      choices: [
        { message: 'Smart contract', name: network.graphNode?.protocol ?? '', value: 'contract' },
        { message: 'Substreams', name: 'substreams', value: 'substreams' },
        { message: 'Subgraph', name: 'subgraph', value: 'subgraph' },
      ].filter(({ name }) => name),
      validate: name => {
        if (name === 'arweave') {
          return 'Arweave only supported via substreams';
        }
        if (name === 'cosmos') {
          return 'Cosmos chains only supported via substreams';
        }
        return true;
      },
      result: protocol => {
        protocolInstance = new Protocol(protocol);
        isComposedSubgraph = protocolInstance.isComposedSubgraph();
        isSubstreams = protocolInstance.isSubstreams();
        initDebugger.extend('processInitForm')('protocol: %O', protocol);
        return protocol;
      },
    });

    promptManager.addStep({
      type: 'input',
      name: 'subgraphName',
      message: 'Subgraph slug',
      initial: initSubgraphName,
      result: value => {
        initDebugger.extend('processInitForm')('subgraphName: %O', value);
        subgraphName = value;
        return value;
      },
    });

    promptManager.addStep({
      type: 'input',
      name: 'directory',
      message: 'Directory to create the subgraph in',
      initial: () => initDirectory || getSubgraphBasename(subgraphName),
      result: value => {
        directory = value;
        initDebugger.extend('processInitForm')('directory: %O', value);
        return value;
      },
    });

    promptManager.addStep({
      type: 'input',
      name: 'source',
      message: () =>
        isComposedSubgraph
          ? 'Source subgraph deployment ID'
          : `Contract ${protocolInstance.getContract()?.identifierName()}`,
      skip: () =>
        initFromExample !== undefined ||
        isSubstreams ||
        (!protocolInstance.hasContract() && !isComposedSubgraph),
      initial: initContract,
      validate: async (value: string) => {
        if (isComposedSubgraph) {
          return value.startsWith('Qm') ? true : 'Subgraph deployment ID must start with Qm';
        }
        if (initFromExample !== undefined || !protocolInstance.hasContract()) {
          return true;
        }

        const { valid, error } = validateContract(value, protocolInstance.getContract()!);
        return valid ? true : error;
      },
      result: async (address: string) => {
        initDebugger.extend('processInitForm')("source: '%s'", address);
        if (
          initFromExample !== undefined ||
          initAbiPath ||
          protocolInstance.name !== 'ethereum' // we can only validate against Etherscan API
        ) {
          source = address;
          return address;
        }

        // If ABI is not provided, try to fetch it from Etherscan API
        if (protocolInstance.hasABIs() && !initAbi) {
          abiFromApi = await retryWithPrompt(() =>
            contractService.getABI(protocolInstance.getABI(), network.id, address),
          );
          initDebugger.extend('processInitForm')("abiFromEtherscan len: '%s'", abiFromApi?.name);
        }
        // If startBlock is not provided, try to fetch it from Etherscan API
        if (!initStartBlock) {
          startBlock = await retryWithPrompt(() =>
            contractService.getStartBlock(network.id, address),
          );
          initDebugger.extend('processInitForm')("startBlockFromEtherscan: '%s'", startBlock);
        }

        // If contract name is not provided, try to fetch it from Etherscan API
        if (!initContractName) {
          contractName = await retryWithPrompt(() =>
            contractService.getContractName(network.id, address),
          );
          initDebugger.extend('processInitForm')("contractNameFromEtherscan: '%s'", contractName);
        }

        source = address;
        return address;
      },
    });

    promptManager.addStep({
      type: 'input',
      name: 'ipfs',
      message: `IPFS node to use for fetching subgraph manifest`,
      initial: ipfsUrl,
      skip: () => !isComposedSubgraph,
      result: value => {
        ipfsNode = value;
        initDebugger.extend('processInitForm')('ipfs: %O', value);
        return value;
      },
    });

    promptManager.addStep({
      type: 'input',
      name: 'spkg',
      message: 'Substreams SPKG (local path, IPFS hash, or URL)',
      initial: () => initSpkgPath,
      skip: () => !isSubstreams || !!initSpkgPath,
      validate: async value => {
        if (!isSubstreams || !!initSpkgPath) return true;
        return await withSpinner(
          `Resolving Substreams SPKG file`,
          `Failed to resolve SPKG file`,
          `Warnings while resolving SPKG file`,
          async () => {
            try {
              const { path, cleanup } = await resolveFile(value, 'substreams.spkg', 10_000);
              spkgPath = path;
              spkgCleanup = cleanup;
              initDebugger.extend('processInitForm')('spkgPath: %O', path);
              return true;
            } catch (e) {
              return e.message;
            }
          },
        );
      },
    });

    promptManager.addStep({
      type: 'input',
      name: 'abiFromFile',
      message: 'ABI file (path)',
      initial: initAbiPath,
      skip: () =>
        !protocolInstance.hasABIs() ||
        initFromExample !== undefined ||
        abiFromApi !== undefined ||
        isSubstreams ||
        !!initAbiPath ||
        isComposedSubgraph,
      validate: async (value: string) => {
        if (
          initFromExample ||
          abiFromApi ||
          !protocolInstance.hasABIs() ||
          isSubstreams ||
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
        initDebugger.extend('processInitForm')('abiFromFile: %O', value);
        if (initFromExample || abiFromApi || !protocolInstance.hasABIs() || isComposedSubgraph) {
          return null;
        }

        const ABI = protocolInstance.getABI();
        if (initAbiPath) value = initAbiPath;

        try {
          abiFromFile = loadAbiFromFile(ABI, value);
          return value;
        } catch (e) {
          return e.message;
        }
      },
    });

    promptManager.addStep({
      type: 'input',
      name: 'startBlock',
      message: 'Start block',
      initial: () => initStartBlock || startBlock || '0',
      skip: () => initFromExample !== undefined || isSubstreams,
      validate: value => parseInt(value) >= 0,
      result: value => {
        startBlock = value;
        initDebugger.extend('processInitForm')('startBlock: %O', value);
        return value;
      },
    });

    promptManager.addStep({
      type: 'input',
      name: 'contractName',
      message: 'Contract name',
      initial: () => initContractName || contractName || 'Contract',
      skip: () => initFromExample !== undefined || !protocolInstance.hasContract() || isSubstreams,
      validate: value => value && value.length > 0,
      result: value => {
        contractName = value;
        initDebugger.extend('processInitForm')('contractName: %O', value);
        return value;
      },
    });

    promptManager.addStep({
      type: 'confirm',
      name: 'indexEvents',
      message: 'Index contract events as entities',
      initial: true,
      skip: () => !!initIndexEvents || isSubstreams || isComposedSubgraph,
      result: value => {
        indexEvents = value === 'true';
        initDebugger.extend('processInitForm')('indexEvents: %O', value);
        return value;
      },
    });

    const results = await promptManager.executeInteractive();
    console.log('results', results);

    return {
      abi: (abiFromApi || abiFromFile)!,
      protocolInstance,
      subgraphName,
      directory: directory!,
      startBlock: startBlock!,
      fromExample: !!initFromExample,
      network: network.id,
      contractName: contractName!,
      source: source!,
      indexEvents,
      ipfs: ipfsNode,
      spkgPath,
      cleanup: spkgCleanup,
    };
  } catch (e) {
    console.error(e);
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
  if (!protocolInstance.isSubstreams()) {
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
      message: () => 'Add another contract?',
      initial: false,
      required: true,
    },
  ]);

  if (!addAnother) return false;

  const ProtocolContract = protocolInstance.getContract()!;
  const { contract } = await prompt.ask<{ contract: string }>([
    {
      type: 'input',
      name: 'contract',
      initial: ProtocolContract.identifierName(),
      required: true,
      message: () => `\nContract ${ProtocolContract.identifierName()}`,
      validate: value => {
        const { valid, error } = validateContract(value, ProtocolContract);
        return valid ? true : error;
      },
    },
  ]);

  const cwd = process.cwd();
  try {
    if (fs.existsSync(directory)) {
      process.chdir(directory);
    }

    await AddCommand.run([contract]);
  } catch (e) {
    this.error(e);
  }
  process.chdir(cwd);

  return true;
}
