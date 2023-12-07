import fs from 'fs';
import os from 'os';
import path from 'path';
import { filesystem, prompt, system } from 'gluegun';
import * as toolbox from 'gluegun';
import { Args, Command, Flags, ux } from '@oclif/core';
import {
  loadAbiFromBlockScout,
  loadAbiFromEtherscan,
  loadStartBlockForContract,
} from '../command-helpers/abi';
import { initNetworksConfig } from '../command-helpers/network';
import { chooseNodeUrl } from '../command-helpers/node';
import { generateScaffold, writeScaffold } from '../command-helpers/scaffold';
import { withSpinner } from '../command-helpers/spinner';
import { getSubgraphBasename, validateSubgraphName } from '../command-helpers/subgraph';
import debugFactory from '../debug';
import Protocol, { ProtocolName } from '../protocols';
import EthereumABI from '../protocols/ethereum/abi';
import { abiEvents } from '../scaffold/schema';
import { validateContract } from '../validation';
import AddCommand from './add';

const protocolChoices = Array.from(Protocol.availableProtocols().keys());
const availableNetworks = Protocol.availableNetworks();

const DEFAULT_EXAMPLE_SUBGRAPH = 'ethereum-gravatar';

const initDebugger = debugFactory('graph-cli:commands:init');

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
    product: Flags.string({
      summary: 'Selects the product for which to initialize.',
      options: ['subgraph-studio', 'hosted-service'],
      deprecated: {
        message:
          'In next major version, this flag will be removed. By default we will deploy to the Graph Studio. Learn more about Sunrise of Decentralized Data https://thegraph.com/blog/unveiling-updated-sunrise-decentralized-data/',
      },
    }),
    studio: Flags.boolean({
      summary: 'Shortcut for "--product subgraph-studio".',
      exclusive: ['product'],
      deprecated: {
        message:
          'In next major version, this flag will be removed. By default we will deploy to the Graph Studio. Learn more about Sunrise of Decentralized Data https://thegraph.com/blog/unveiling-updated-sunrise-decentralized-data/',
      },
    }),
    node: Flags.string({
      summary: 'Graph node for which to initialize.',
      char: 'g',
    }),
    'allow-simple-name': Flags.boolean({
      description: 'Use a subgraph name without a prefix.',
      default: false,
      deprecated: {
        message:
          'In next major version, this flag will be removed. By default we will deploy to the Graph Studio. Learn more about Sunrise of Decentralized Data https://thegraph.com/blog/unveiling-updated-sunrise-decentralized-data/',
      },
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
      dependsOn: ['from-contract'],
      options: [
        ...availableNetworks.get('ethereum')!,
        ...availableNetworks.get('near')!,
        ...availableNetworks.get('cosmos')!,
      ],
    }),
  };

  async run() {
    const {
      args: { subgraphName, directory },
      flags,
    } = await this.parse(InitCommand);

    const {
      protocol,
      product,
      studio,
      node: nodeFlag,
      'allow-simple-name': allowSimpleNameFlag,
      'from-contract': fromContract,
      'contract-name': contractName,
      'from-example': fromExample,
      'index-events': indexEvents,
      'skip-install': skipInstall,
      'skip-git': skipGit,
      network,
      abi: abiPath,
      'start-block': startBlock,
      spkg: spkgPath,
    } = flags;

    initDebugger('Flags: %O', flags);
    let { node, allowSimpleName } = chooseNodeUrl({
      product,
      // if we are loading example, we want to ensure we are using studio
      studio: studio || fromExample !== undefined,
      node: nodeFlag,
      allowSimpleName: allowSimpleNameFlag,
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
          allowSimpleName,
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
            process.exitCode = 1;
            return;
          }
        }
      }

      await initSubgraphFromContract.bind(this)(
        {
          protocolInstance,
          abi,
          allowSimpleName,
          directory,
          contract: fromContract,
          indexEvents,
          network,
          subgraphName,
          contractName,
          node,
          startBlock,
          spkgPath,
          skipInstall,
          skipGit,
        },
        { commands, addContract: false },
      );
      // Exit with success
      return this.exit(0);
    }

    if (fromExample) {
      const answers = await processFromExampleInitForm.bind(this)({
        allowSimpleName,
        subgraphName,
        directory,
      });

      if (!answers) {
        this.exit(1);
        return;
      }

      await initSubgraphFromExample.bind(this)(
        {
          allowSimpleName,
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
        product,
        studio,
        node,
        abi,
        abiPath,
        allowSimpleName,
        directory,
        contract: fromContract,
        indexEvents,
        fromExample,
        network,
        subgraphName,
        contractName,
        startBlock,
        spkgPath,
      });
      if (!answers) {
        this.exit(1);
        return;
      }

      ({ node, allowSimpleName } = chooseNodeUrl({
        product: answers.product,
        studio: answers.studio,
        node,
        allowSimpleName,
      }));
      await initSubgraphFromContract.bind(this)(
        {
          protocolInstance: answers.protocolInstance,
          allowSimpleName,
          subgraphName: answers.subgraphName,
          directory: answers.directory,
          abi: answers.abi,
          network: answers.network,
          contract: answers.contract,
          indexEvents: answers.indexEvents,
          contractName: answers.contractName,
          node,
          startBlock: answers.startBlock,
          spkgPath: answers.spkgPath,
          skipInstall,
          skipGit,
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
    allowSimpleName: initAllowSimpleName,
  }: {
    directory?: string;
    subgraphName?: string;
    allowSimpleName: boolean | undefined;
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
        // TODO: is defaulting to studio ok?
        message: () => 'Subgraph slug',
        initial: initSubgraphName,
        validate: name => {
          try {
            validateSubgraphName(name, {
              allowSimpleName: initAllowSimpleName,
            });
            return true;
          } catch (e) {
            return `${e.message}

    Examples:

      $ graph init ${os.userInfo().username}/${name}
      $ graph init ${name} --allow-simple-name`;
          }
        },
      },
    ]);

    const { directory } = await prompt.ask<{ directory: string }>([
      {
        type: 'input',
        name: 'directory',
        message: 'Directory to create the subgraph in',
        initial: () => initDirectory || getSubgraphBasename(subgraphName),
        validate: value =>
          filesystem.exists(value || initDirectory || getSubgraphBasename(subgraphName))
            ? 'Directory already exists'
            : true,
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
      const { retry } = await toolbox.prompt.ask({
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
    product: initProduct,
    studio: initStudio,
    node: initNode,
    abi: initAbi,
    abiPath: initAbiPath,
    directory: initDirectory,
    contract: initContract,
    indexEvents: initIndexEvents,
    fromExample: initFromExample,
    network: initNetwork,
    subgraphName: initSubgraphName,
    contractName: initContractName,
    startBlock: initStartBlock,
    allowSimpleName: initAllowSimpleName,
    spkgPath: initSpkgPath,
  }: {
    protocol?: ProtocolName;
    product?: string;
    studio: boolean;
    node?: string;
    abi: EthereumABI;
    abiPath?: string;
    allowSimpleName: boolean | undefined;
    directory?: string;
    contract?: string;
    indexEvents: boolean;
    fromExample?: string | boolean;
    network?: string;
    subgraphName?: string;
    contractName?: string;
    startBlock?: string;
    spkgPath?: string;
  },
): Promise<
  | {
      abi: EthereumABI;
      protocolInstance: Protocol;
      subgraphName: string;
      directory: string;
      studio: boolean;
      product: string;
      network: string;
      contract: string;
      indexEvents: boolean;
      contractName: string;
      startBlock: string;
      fromExample: boolean;
      spkgPath: string | undefined;
    }
  | undefined
> {
  let abiFromEtherscan: EthereumABI | undefined = undefined;

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
    const isSubstreams = protocol === 'substreams';
    initDebugger.extend('processInitForm')('isSubstreams: %O', isSubstreams);

    const { product } = await prompt.ask<{
      product: 'subgraph-studio' | 'hosted-service';
    }>([
      {
        type: 'select',
        name: 'product',
        message: 'Product for which to initialize',
        choices: ['subgraph-studio', 'hosted-service'],
        skip:
          protocol === 'arweave' ||
          protocol === 'cosmos' ||
          protocol === 'near' ||
          initProduct === 'subgraph-studio' ||
          initProduct === 'hosted-service' ||
          initStudio !== undefined ||
          initNode !== undefined,
        result: value => {
          if (initProduct) return initProduct;
          if (initStudio) return 'subgraph-studio';
          // For now we only support NEAR subgraphs in the Hosted Service
          if (protocol === 'near') {
            return 'hosted-service';
          }

          if (value == 'subgraph-studio') {
            initAllowSimpleName = true;
          }

          return value;
        },
      },
    ]);

    const { subgraphName } = await prompt.ask<{ subgraphName: string }>([
      {
        type: 'input',
        name: 'subgraphName',
        message: () => (product == 'subgraph-studio' ? 'Subgraph slug' : 'Subgraph name'),
        initial: initSubgraphName,
        validate: name => {
          try {
            validateSubgraphName(name, {
              allowSimpleName: initAllowSimpleName,
            });
            return true;
          } catch (e) {
            return `${e.message}

    Examples:

      $ graph init ${os.userInfo().username}/${name}
      $ graph init ${name} --allow-simple-name`;
          }
        },
      },
    ]);

    const { directory } = await prompt.ask<{ directory: string }>([
      {
        type: 'input',
        name: 'directory',
        message: 'Directory to create the subgraph in',
        initial: () => initDirectory || getSubgraphBasename(subgraphName),
        validate: value =>
          filesystem.exists(value || initDirectory || getSubgraphBasename(subgraphName))
            ? 'Directory already exists'
            : true,
      },
    ]);

    const { network } = await prompt.ask<{ network: string }>([
      {
        type: 'select',
        name: 'network',
        message: () => `${protocolInstance.displayName()} network`,
        choices: availableNetworks
          .get(protocol as ProtocolName) // Get networks related to the chosen protocol.
          ?.toArray() || ['mainnet'],
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

    const { contract } = await prompt.ask<{ contract: string }>([
      // TODO:
      // protocols that don't support contract
      // - arweave
      // - cosmos
      {
        type: 'input',
        name: 'contract',
        message: `Contract ${protocolInstance.getContract()?.identifierName()}`,
        skip: () =>
          initFromExample !== undefined || !protocolInstance.hasContract() || isSubstreams,
        initial: initContract,
        validate: async (value: string) => {
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
          if (initFromExample !== undefined || isSubstreams || initAbiPath) {
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
              initStartBlock = Number(startBlock).toString();
            }
          }
          return value;
        },
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
        initial: initAbi,
        skip: () =>
          !protocolInstance.hasABIs() ||
          initFromExample !== undefined ||
          abiFromEtherscan !== undefined ||
          isSubstreams ||
          !!initAbiPath,
        validate: async (value: string) => {
          if (initFromExample || abiFromEtherscan || !protocolInstance.hasABIs()) {
            return true;
          }

          const ABI = protocolInstance.getABI();
          if (initAbiPath) {
            try {
              loadAbiFromFile(ABI, initAbiPath);
              return true;
            } catch (e) {
              this.error(e.message);
            }
          }

          try {
            loadAbiFromFile(ABI, value);
            return true;
          } catch (e) {
            this.error(e.message);
          }
        },
        result: async (value: string) => {
          if (initFromExample || abiFromEtherscan || !protocolInstance.hasABIs()) {
            return null;
          }
          const ABI = protocolInstance.getABI();
          if (initAbiPath) {
            try {
              return loadAbiFromFile(ABI, initAbiPath);
            } catch (e) {
              return e.message;
            }
          }

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
        initial: initStartBlock || '0',
        skip: () => initFromExample !== undefined || isSubstreams,
        validate: value => parseInt(value) >= 0,
        result(value) {
          if (initStartBlock) return initStartBlock;
          return value;
        },
      },
    ]);

    const { contractName } = await prompt.ask<{ contractName: string }>([
      {
        type: 'input',
        name: 'contractName',
        message: 'Contract Name',
        initial: initContractName || 'Contract' || isSubstreams,
        skip: () => initFromExample !== undefined || !protocolInstance.hasContract(),
        validate: value => value && value.length > 0,
      },
    ]);

    const { indexEvents } = await prompt.ask<{ indexEvents: boolean }>([
      {
        type: 'confirm',
        name: 'indexEvents',
        message: 'Index contract events as entities',
        initial: true,
        skip: () => !!initIndexEvents || isSubstreams,
      },
    ]);

    return {
      abi: abiFromEtherscan || abiFromFile,
      protocolInstance,
      subgraphName,
      directory,
      studio: product === 'subgraph-studio',
      startBlock,
      fromExample: !!initFromExample,
      product,
      network,
      contractName,
      contract,
      indexEvents,
      spkgPath: spkg,
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

function revalidateSubgraphName(
  this: InitCommand,
  subgraphName: string,
  { allowSimpleName }: { allowSimpleName: boolean | undefined },
) {
  // Fail if the subgraph name is invalid
  try {
    validateSubgraphName(subgraphName, { allowSimpleName });
    return true;
  } catch (e) {
    this.error(`${e.message}

  Examples:

    $ graph init ${os.userInfo().username}/${subgraphName}
    $ graph init ${subgraphName} --allow-simple-name`);
  }
}

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
    allowSimpleName,
    subgraphName,
    directory,
    skipInstall,
    skipGit,
  }: {
    fromExample: string | boolean;
    allowSimpleName?: boolean;
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
  // Fail if the subgraph name is invalid
  if (!revalidateSubgraphName.bind(this)(subgraphName, { allowSimpleName })) {
    process.exitCode = 1;
    return;
  }

  // Fail if the output directory already exists
  if (filesystem.exists(directory)) {
    this.error(`Directory or file "${directory}" already exists`, { exit: 1 });
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

        filesystem.copy(exampleSubgraphPath, directory);
        return true;
      } finally {
        filesystem.remove(tmpDir);
      }
    },
  );
  if (!cloned) {
    this.exit(1);
    return;
  }

  const networkConf = await initNetworksConfig(directory, 'address');
  if (networkConf !== true) {
    this.exit(1);
    return;
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
    return;
  }

  // Initialize a fresh Git repository
  if (!skipGit) {
    const repo = await initRepository(directory);
    if (repo !== true) {
      this.exit(1);
      return;
    }
  }

  // Install dependencies
  if (!skipInstall) {
    const installed = await installDependencies(directory, commands);
    if (installed !== true) {
      this.exit(1);
      return;
    }
  }

  // Run code-generation
  const codegen = await runCodegen(directory, commands.codegen);
  if (codegen !== true) {
    this.exit(1);
    return;
  }

  printNextSteps.bind(this)({ subgraphName, directory }, { commands });
}

async function initSubgraphFromContract(
  this: InitCommand,
  {
    protocolInstance,
    allowSimpleName,
    subgraphName,
    directory,
    abi,
    network,
    contract,
    indexEvents,
    contractName,
    node,
    startBlock,
    spkgPath,
    skipInstall,
    skipGit,
  }: {
    protocolInstance: Protocol;
    allowSimpleName: boolean | undefined;
    subgraphName: string;
    directory: string;
    abi: EthereumABI;
    network: string;
    contract: string;
    indexEvents: boolean;
    contractName?: string;
    node?: string;
    startBlock?: string;
    spkgPath?: string;
    skipInstall: boolean;
    skipGit: boolean;
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

  // Fail if the subgraph name is invalid
  if (!revalidateSubgraphName.bind(this)(subgraphName, { allowSimpleName })) {
    this.exit(1);
    return;
  }

  // Fail if the output directory already exists
  if (filesystem.exists(directory)) {
    this.error(`Directory or file "${directory}" already exists`, { exit: 1 });
  }

  if (
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
          contract,
          indexEvents,
          contractName,
          startBlock,
          node,
          spkgPath,
        },
        spinner,
      );
      await writeScaffold(scaffold, directory, spinner);
      return true;
    },
  );
  if (scaffold !== true) {
    process.exitCode = 1;
    return;
  }

  if (protocolInstance.hasContract()) {
    const identifierName = protocolInstance.getContract()!.identifierName();
    const networkConf = await initNetworksConfig(directory, identifierName);
    if (networkConf !== true) {
      process.exitCode = 1;
      return;
    }
  }

  // Initialize a fresh Git repository
  if (!skipGit) {
    const repo = await initRepository(directory);
    if (repo !== true) {
      this.exit(1);
      return;
    }
  }

  if (!skipInstall) {
    // Install dependencies
    const installed = await installDependencies(directory, commands);
    if (installed !== true) {
      this.exit(1);
      return;
    }
  }

  // Substreams we have nothing to install or generate
  if (!isSubstreams) {
    // Run code-generation
    const codegen = await runCodegen(directory, commands.codegen);
    if (codegen !== true) {
      this.exit(1);
      return;
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
  const addContractAnswer = await ux.prompt('Add another contract? (y/n)', {
    required: true,
    type: 'single',
  });
  const addContractConfirmation = addContractAnswer.toLowerCase() === 'y';

  if (addContractConfirmation) {
    const ProtocolContract = protocolInstance.getContract()!;

    let contract = '';
    for (;;) {
      contract = await ux.prompt(`\nContract ${ProtocolContract.identifierName()}`, {
        required: true,
      });
      const { valid, error } = validateContract(contract, ProtocolContract);
      if (valid) {
        break;
      }
      this.log(`✖ ${error}`);
    }

    const contractName = await ux.prompt('\nContract Name', {
      required: true,
      default: 'Contract',
    });

    // Get the cwd before process.chdir in order to switch back in the end of command execution
    const cwd = process.cwd();

    try {
      if (fs.existsSync(directory)) {
        process.chdir(directory);
      }

      const commandLine = [contract, '--contract-name', contractName];

      await AddCommand.run(commandLine);
    } catch (e) {
      this.error(e);
    } finally {
      // TODO: safer way of doing this?
      process.chdir(cwd);
    }
  }

  return addContractConfirmation;
}
