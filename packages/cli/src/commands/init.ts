import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { filesystem, print, prompt, system } from 'gluegun';
import { Args, Command, Flags } from '@oclif/core';
import { Network } from '@pinax/graph-networks-registry';
import { appendApiVersionForGraph } from '../command-helpers/compiler.js';
import { ContractService } from '../command-helpers/contracts.js';
import { resolveFile } from '../command-helpers/file-resolver.js';
import { DEFAULT_IPFS_URL } from '../command-helpers/ipfs.js';
import { initNetworksConfig } from '../command-helpers/network.js';
import { chooseNodeUrl } from '../command-helpers/node.js';
import { PromptManager } from '../command-helpers/prompt-manager.js';
import { loadRegistry } from '../command-helpers/registry.js';
import { retryWithPrompt } from '../command-helpers/retry.js';
import { generateScaffold, writeScaffold } from '../command-helpers/scaffold.js';
import { sortWithPriority } from '../command-helpers/sort.js';
import { withSpinner } from '../command-helpers/spinner.js';
import {
  formatContractName,
  formatSubgraphName,
  getSubgraphBasename,
} from '../command-helpers/subgraph.js';
import { GRAPH_CLI_SHARED_HEADERS } from '../constants.js';
import debugFactory from '../debug.js';
import EthereumABI from '../protocols/ethereum/abi.js';
import Protocol, { ProtocolName } from '../protocols/index.js';
import { abiEvents } from '../scaffold/schema.js';
import Schema from '../schema.js';
import {
  createIpfsClient,
  getMinStartBlock,
  loadManifestYaml,
  loadSubgraphSchemaFromIPFS,
  validateSubgraphNetworkMatch,
} from '../utils.js';
import { validateContract } from '../validation/index.js';
import AddCommand from './add.js';

const protocolChoices = Array.from(Protocol.availableProtocols().keys());

const initDebugger = debugFactory('graph-cli:commands:init');

const DEFAULT_EXAMPLE_SUBGRAPH = 'ethereum-gravatar';
const DEFAULT_CONTRACT_NAME = 'Contract';

export default class InitCommand extends Command {
  static description = 'Creates a new subgraph with basic scaffolding.';

  static args = {
    argSubgraphName: Args.string(),
    argDirectory: Args.string(),
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
    'from-subgraph': Flags.string({
      description: 'Creates a scaffold based on an existing subgraph.',
      exclusive: ['from-example', 'from-contract'],
    }),
    'from-contract': Flags.string({
      description: 'Creates a scaffold based on an existing contract.',
      exclusive: ['from-example'],
    }),
    'from-example': Flags.string({
      description: 'Creates a scaffold based on an example subgraph.',
      // TODO: using a default sets the value and therefore requires not to have --from-contract
      // default: 'Contract',
      exclusive: ['from-contract', 'spkg'],
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
    }),
    'start-block': Flags.string({
      helpGroup: 'Scaffold from contract',
      description: 'Block number to start indexing from.',
      // TODO: using a default sets the value and therefore requires --from-contract
      // default: '0',
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
    }),

    ipfs: Flags.string({
      summary: 'IPFS node to use for fetching subgraph data.',
      char: 'i',
      default: DEFAULT_IPFS_URL,
    }),
  };

  async run() {
    const {
      args: { argSubgraphName, argDirectory },
      flags,
    } = await this.parse(InitCommand);

    const subgraphName = formatSubgraphName(argSubgraphName ?? '');
    const directory = argDirectory ?? '';

    const {
      protocol,
      node: nodeFlag,
      'from-contract': fromContract,
      'from-subgraph': fromSubgraph,
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

    if (startBlock && !(fromContract || fromSubgraph)) {
      this.error('--start-block can only be used with --from-contract or --from-subgraph');
    }

    if (fromContract && fromSubgraph) {
      this.error('Cannot use both --from-contract and --from-subgraph at the same time');
    }

    if (skipGit) {
      this.warn(
        'The --skip-git flag will be removed in the next major version. By default we will stop initializing a Git repository.',
      );
    }

    if ((fromContract || spkgPath) && !network && !fromExample) {
      this.error('--network is required when using --from-contract or --spkg');
    }

    const { node } = chooseNodeUrl({
      node: nodeFlag,
    });

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
    // go straight to creating the subgraph from an existing contract or source subgraph
    if (
      (fromContract || spkgPath || fromSubgraph) &&
      protocol &&
      subgraphName &&
      directory &&
      network &&
      node
    ) {
      if (!protocolChoices.includes(protocol as ProtocolName)) {
        this.error(
          `Protocol '${protocol}' is not supported, choose from these options: ${protocolChoices.join(
            ', ',
          )}`,
          { exit: 1 },
        );
      }

      const protocolInstance = new Protocol(protocol as ProtocolName);

      if (fromSubgraph && !protocolInstance.isComposedSubgraph()) {
        this.error('--protocol can only be subgraph when using --from-subgraph');
      }

      if (
        fromContract &&
        (protocolInstance.isComposedSubgraph() || protocolInstance.isSubstreams())
      ) {
        this.error('--protocol cannot be subgraph or substreams when using --from-contract');
      }

      if (spkgPath && !protocolInstance.isSubstreams()) {
        this.error('--protocol can only be substreams when using --spkg');
      }

      // Only fetch contract info and ABI for non-source-subgraph cases
      if (!fromSubgraph && protocolInstance.hasABIs()) {
        const registry = await loadRegistry();
        const contractService = new ContractService(registry);
        const sourcifyContractInfo = await contractService.getFromSourcify(
          EthereumABI,
          network,
          fromContract!,
        );

        const ABI = protocolInstance.getABI();
        if (abiPath) {
          try {
            abi = loadAbiFromFile(ABI, abiPath);
          } catch (e) {
            this.error(`Failed to load ABI: ${e.message}`, { exit: 1 });
          }
        } else {
          try {
            abi = sourcifyContractInfo
              ? sourcifyContractInfo.abi
              : await contractService.getABI(ABI, network, fromContract!);
          } catch (e) {
            this.error(`Failed to get ABI: ${e.message}`, { exit: 1 });
          }
        }
      }

      await initSubgraphFromContract.bind(this)(
        {
          protocolInstance,
          abi,
          directory,
          source: fromSubgraph || fromContract!,
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
        source: fromContract || fromSubgraph,
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
    const promptManager = new PromptManager();

    let subgraphName = initSubgraphName;
    let directory = initDirectory;

    promptManager.addStep({
      type: 'input',
      name: 'subgraphName',
      message: 'Subgraph slug',
      initial: initSubgraphName,
      validate: value => formatSubgraphName(value).length > 0 || 'Subgraph slug must not be empty',
      result: value => {
        value = formatSubgraphName(value);
        initDebugger.extend('processFromExampleInitForm')('subgraphName: %O', value);
        subgraphName = value;
        return value;
      },
    });

    promptManager.addStep({
      type: 'input',
      name: 'directory',
      message: 'Directory to create the subgraph in',
      initial: () => initDirectory || getSubgraphBasename(subgraphName!),
      validate: value => value.length > 0 || 'Directory must not be empty',
      result: value => {
        directory = value;
        initDebugger.extend('processFromExampleInitForm')('directory: %O', value);
        return value;
      },
    });

    await promptManager.executeInteractive();

    return {
      subgraphName: subgraphName!,
      directory: directory!,
    };
  } catch (e) {
    this.error(e, { exit: 1 });
  }
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
    const registry = await loadRegistry();
    const contractService = new ContractService(registry);

    const networks = sortWithPriority(
      registry.networks,
      n => n.issuanceRewards,
      (a, b) => registry.networks.indexOf(a) - registry.networks.indexOf(b),
    );

    const networkToChoice = (n: Network) => ({
      name: n.id,
      value: `${n.id}:${n.shortName}:${n.fullName}`.toLowerCase(),
      hint: `· ${n.id}`,
      message: n.fullName,
    });

    const formatChoices = (choices: ReturnType<typeof networkToChoice>[]) => {
      const shown = choices.slice(0, 20);
      const remaining = networks.length - shown.length;
      if (remaining == 0) return shown;
      if (shown.length === choices.length) {
        shown.push({
          name: 'N/A',
          value: '',
          hint: '· other network not on the list',
          message: `Other`,
        });
      }
      return [
        ...shown,
        {
          name: ``,
          disabled: true,
          hint: '',
          message: `< ${remaining} more - type to filter >`,
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
      format: value => {
        const network = networks.find(n => n.id === value);
        return network
          ? `${network.fullName}${print.colors.muted(` · ${network.id} · ${network.explorerUrls?.[0] ?? ''}`)}`
          : value;
      },
      suggest: (input, _) =>
        formatChoices(
          networks
            .map(networkToChoice)
            .filter(({ value }) => (value ?? '').includes(input.toLowerCase())),
        ),
      validate: value =>
        value === 'N/A' || networks.find(n => n.id === value) ? true : 'Pick a network',
      result: value => {
        initDebugger.extend('processInitForm')('networkId: %O', value);
        const foundNetwork = networks.find(n => n.id === value);
        if (!foundNetwork) {
          this.log(`
  The chain list is populated from the Networks Registry:

  https://github.com/graphprotocol/networks-registry

  To add a chain to the registry you can create an issue or submit a PR`);
          process.exit(0);
        }
        network = foundNetwork;
        promptManager.setOptions('protocol', {
          choices: [
            {
              message: 'Smart contract',
              hint: '· default',
              name: network.graphNode?.protocol ?? '',
              value: 'contract',
            },
            { message: 'Substreams', name: 'substreams', value: 'substreams' },
            { message: 'Subgraph', name: 'subgraph', value: 'subgraph' },
          ].filter(({ name }) => name),
        });

        return value;
      },
    });

    promptManager.addStep({
      type: 'select',
      name: 'protocol',
      message: 'Source',
      choices: [],
      validate: name => {
        if (name === 'arweave') {
          return 'Arweave are only supported via substreams';
        }
        if (name === 'cosmos') {
          return 'Cosmos chains are only supported via substreams';
        }
        return true;
      },
      format: protocol => {
        switch (protocol) {
          case '':
            return '';
          case 'substreams':
            return 'Substreams';
          case 'subgraph':
            return 'Subgraph';
          default:
            return `Smart Contract${print.colors.muted(` · ${protocol}`)}`;
        }
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
      validate: value => formatSubgraphName(value).length > 0 || 'Subgraph slug must not be empty',
      result: value => {
        value = formatSubgraphName(value);
        initDebugger.extend('processInitForm')('subgraphName: %O', value);
        subgraphName = value;
        return value;
      },
    });

    promptManager.addStep({
      type: 'input',
      name: 'directory',
      message: 'Directory to create the subgraph in',
      initial: () => initDirectory || getSubgraphBasename(subgraphName!),
      validate: value => value.length > 0 || 'Directory must not be empty',
      result: value => {
        directory = value;
        initDebugger.extend('processInitForm')('directory: %O', value);
        return value;
      },
    });

    promptManager.addStep({
      type: 'input',
      name: 'ipfs',
      message: `IPFS node to use for fetching subgraph manifest`,
      initial: ipfsUrl,
      skip: () => !isComposedSubgraph,
      validate: value => {
        if (!value) {
          return 'IPFS node URL cannot be empty';
        }
        try {
          new URL(value);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      },
      result: value => {
        ipfsNode = value;
        initDebugger.extend('processInitForm')('ipfs: %O', value);
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
      validate: async (value: string): Promise<string | boolean> => {
        if (isComposedSubgraph) {
          const ipfs = createIpfsClient(ipfsNode);
          const manifestYaml = await loadManifestYaml(ipfs, value);
          const { valid, error } = validateSubgraphNetworkMatch(manifestYaml, network.id);
          if (!valid) {
            return error || 'Invalid subgraph network match';
          }
          startBlock ||= getMinStartBlock(manifestYaml)?.toString();
          return true;
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

        // If ABI is not provided, try to fetch it from Sourcify/Etherscan API
        if (protocolInstance.hasABIs() && !initAbi) {
          const sourcifyContractInfo = await withSpinner(
            'Fetching ABI from Sourcify API...',
            'Failed to fetch ABI',
            'Warning fetching ABI',
            () => contractService.getFromSourcify(protocolInstance.getABI(), network.id, address),
          );
          if (sourcifyContractInfo) {
            initStartBlock ??= sourcifyContractInfo.startBlock;
            initContractName ??= sourcifyContractInfo.name;
            abiFromApi ??= sourcifyContractInfo.abi;
            initDebugger.extend('processInitForm')(
              "infoFromSourcify: '%s'/'%s'",
              initStartBlock,
              initContractName,
            );
          } else {
            abiFromApi = await retryWithPrompt(() =>
              withSpinner(
                'Fetching ABI from Contract API...',
                'Failed to fetch ABI',
                'Warning fetching ABI',
                () => contractService.getABI(protocolInstance.getABI(), network.id, address),
              ),
            );
            initDebugger.extend('processInitForm')("abiFromEtherscan ABI: '%s'", abiFromApi?.name);
          }
        } else {
          abiFromApi = initAbi;
        }

        // If startBlock is not provided, try to fetch it from Etherscan API
        if (!initStartBlock) {
          startBlock = await retryWithPrompt(() =>
            withSpinner(
              'Fetching start block from Contract API...',
              'Failed to fetch start block',
              'Warning fetching start block',
              () => contractService.getStartBlock(network.id, address),
            ),
          );
          initDebugger.extend('processInitForm')("startBlockFromEtherscan: '%s'", startBlock);
        }

        // If contract name is not provided, try to fetch it from Etherscan API
        if (!initContractName) {
          contractName = await retryWithPrompt(() =>
            withSpinner(
              'Fetching contract name from Contract API...',
              'Failed to fetch contract name',
              'Warning fetching contract name',
              () => contractService.getContractName(network.id, address),
            ),
          );
          initDebugger.extend('processInitForm')("contractNameFromEtherscan: '%s'", contractName);
        }

        source = address;
        return address;
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
      validate: async (value: string): Promise<string | boolean> => {
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
      initial: () => String(initStartBlock || startBlock || 0),
      skip: () => initFromExample !== undefined || isSubstreams,
      validate: value =>
        initFromExample !== undefined ||
        isSubstreams ||
        parseInt(value) >= 0 ||
        'Invalid start block',
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
      initial: () => initContractName || contractName || DEFAULT_CONTRACT_NAME,
      skip: () => initFromExample !== undefined || !protocolInstance.hasContract() || isSubstreams,
      validate: value =>
        initFromExample !== undefined ||
        !protocolInstance.hasContract() ||
        isSubstreams ||
        value.length > 0 ||
        'Contract name must not be empty',
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
        indexEvents = String(value) === 'true';
        initDebugger.extend('processInitForm')('indexEvents: %O', indexEvents);
        return value;
      },
    });

    await promptManager.executeInteractive();

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
  if (filesystem.exists(directory)) {
    const overwrite = await prompt
      .confirm(
        'Directory already exists, do you want to initialize the subgraph here (files will be overwritten) ?',
        false,
      )
      .catch(() => false);

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

        filesystem.copy(exampleSubgraphPath, directory, { overwrite: true });
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
  if (filesystem.exists(directory)) {
    const overwrite = await prompt
      .confirm(
        'Directory already exists, do you want to initialize the subgraph here (files will be overwritten) ?',
        false,
      )
      .catch(() => false);

    if (!overwrite) {
      this.exit(1);
    }
  }

  let immutableEntities: string[] | undefined;

  if (isComposedSubgraph) {
    try {
      const ipfsClient = createIpfsClient({
        url: appendApiVersionForGraph(ipfsUrl),
        headers: {
          ...GRAPH_CLI_SHARED_HEADERS,
        },
      });

      // Validate network match first
      const manifestYaml = await loadManifestYaml(ipfsClient, source);
      const { valid, error } = validateSubgraphNetworkMatch(manifestYaml, network);
      if (!valid) {
        throw new Error(error || 'Invalid subgraph network match');
      }

      startBlock ||= getMinStartBlock(manifestYaml)?.toString();
      const schemaString = await loadSubgraphSchemaFromIPFS(ipfsClient, source);
      const schema = await Schema.loadFromString(schemaString);
      immutableEntities = schema.getImmutableEntityNames();

      if (immutableEntities.length === 0) {
        this.error(
          'Source subgraph must have at least one immutable entity. This subgraph cannot be used as a source subgraph since it has no immutable entities.',
          { exit: 1 },
        );
      }
    } catch (e) {
      this.error(`Failed to load and parse subgraph schema: ${e.message}`, { exit: 1 });
    }
  }

  if (
    !isComposedSubgraph &&
    protocolInstance.hasABIs() &&
    abi && // Add check for abi existence
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
      initDebugger('Generating scaffold with ABI:', abi);
      initDebugger('ABI data:', abi?.data);
      if (abi) {
        initDebugger('ABI events:', abiEvents(abi));
      }

      const scaffold = await generateScaffold(
        {
          protocolInstance,
          subgraphName,
          abi,
          network,
          source,
          indexEvents,
          contractName: formatContractName(contractName || DEFAULT_CONTRACT_NAME),
          startBlock,
          node,
          spkgPath,
          entities: immutableEntities,
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

    while (addContract && !isComposedSubgraph) {
      addContract = await addAnotherContract
        .bind(this)({
          protocolInstance,
          directory,
        })
        .catch(() => false);
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
