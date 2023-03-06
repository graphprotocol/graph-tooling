import fs from 'fs';
import os from 'os';
import path from 'path';
import { Args, Command, Flags, ux } from '@oclif/core';
import { filesystem, prompt, system } from 'gluegun';
import {
  loadAbiFromBlockScout,
  loadAbiFromEtherscan,
  loadStartBlockForContract,
} from '../command-helpers/abi';
import * as DataSourcesExtractor from '../command-helpers/data-sources';
import { initNetworksConfig } from '../command-helpers/network';
import { chooseNodeUrl } from '../command-helpers/node';
import { generateScaffold, writeScaffold } from '../command-helpers/scaffold';
import { withSpinner } from '../command-helpers/spinner';
import { validateStudioNetwork } from '../command-helpers/studio';
import { getSubgraphBasename, validateSubgraphName } from '../command-helpers/subgraph';
import debug from '../debug';
import Protocol, { ProtocolName } from '../protocols';
import { ContractCtor } from '../protocols/contract';
import EthereumABI from '../protocols/ethereum/abi';
import { abiEvents } from '../scaffold/schema';
import { validateContract } from '../validation';
import AddCommand from './add';

const initDebug = debug('graph-cli:init');

const protocolChoices = Array.from(Protocol.availableProtocols().keys());
const availableNetworks = Protocol.availableNetworks();

const DEFAULT_EXAMPLE_SUBGRAPH = 'ethereum/gravatar';

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
    }),
    studio: Flags.boolean({
      summary: 'Shortcut for "--product subgraph-studio".',
      exclusive: ['product'],
    }),
    node: Flags.string({
      summary: 'Graph node for which to initialize.',
      char: 'g',
    }),
    'allow-simple-name': Flags.boolean({
      description: 'Use a subgraph name without a prefix.',
      default: false,
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
      flags: {
        protocol,
        product,
        studio,
        node: nodeFlag,
        'allow-simple-name': allowSimpleNameFlag,
        'from-contract': fromContract,
        'contract-name': contractName,
        'from-example': fromExample,
        'index-events': indexEvents,
        network,
        abi: abiPath,
        'start-block': startBlock,
      },
    } = await this.parse(InitCommand);

    let { node, allowSimpleName } = chooseNodeUrl({
      product,
      studio,
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
      return await initSubgraphFromExample.bind(this)(
        { fromExample, allowSimpleName, directory, subgraphName, studio, product },
        { commands },
      );
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

      return await initSubgraphFromContract.bind(this)(
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
          studio,
          product,
          startBlock,
        },
        { commands, addContract: false },
      );
    }

    // Otherwise, take the user through the interactive form
    const answers = await processInitForm.bind(this)({
      protocol: protocol as ProtocolName | undefined,
      product,
      studio,
      node,
      abi,
      allowSimpleName,
      directory,
      contract: fromContract,
      indexEvents,
      fromExample,
      network,
      subgraphName,
      contractName,
      startBlock,
    });
    if (!answers) {
      this.exit(1);
      return;
    }

    if (fromExample) {
      await initSubgraphFromExample.bind(this)(
        {
          fromExample,
          subgraphName: answers.subgraphName,
          directory: answers.directory,
          studio: answers.studio,
          product: answers.product,
        },
        { commands },
      );
    } else {
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
          studio: answers.studio,
          product: answers.product,
          startBlock: answers.startBlock,
        },
        { commands, addContract: true },
      );
    }
  }
}

async function processInitForm(
  this: InitCommand,
  {
    protocol,
    product,
    studio,
    node,
    abi,
    allowSimpleName,
    directory,
    contract,
    indexEvents,
    fromExample,
    network,
    subgraphName,
    contractName,
    startBlock,
  }: {
    protocol?: ProtocolName;
    product?: string;
    studio: boolean;
    node?: string;
    abi: EthereumABI;
    allowSimpleName: boolean | undefined;
    directory?: string;
    contract?: string;
    indexEvents: boolean;
    fromExample?: string | boolean;
    network?: string;
    subgraphName?: string;
    contractName?: string;
    startBlock?: string;
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
      fromExample: string;
    }
  | undefined
> {
  let abiFromEtherscan: EthereumABI | undefined = undefined;
  let abiFromFile = undefined;
  let protocolInstance!: Protocol;
  let ProtocolContract: ContractCtor;
  let ABI: typeof EthereumABI;

  const questions = [
    {
      type: 'select',
      name: 'protocol',
      message: 'Protocol',
      choices: protocolChoices,
      skip: protocolChoices.includes(String(protocol) as ProtocolName),
      result: (value: ProtocolName) => {
        // eslint-disable-next-line -- prettier has problems with ||=
        protocol = protocol || value;
        protocolInstance = new Protocol(protocol);
        return protocol;
      },
    },
    {
      type: 'select',
      name: 'product',
      message: 'Product for which to initialize',
      choices: ['subgraph-studio', 'hosted-service'],
      skip: () =>
        protocol === 'arweave' ||
        protocol === 'cosmos' ||
        protocol === 'near' ||
        product === 'subgraph-studio' ||
        product === 'hosted-service' ||
        studio !== undefined ||
        node !== undefined,
      result: (value: string | undefined) => {
        // For now we only support NEAR subgraphs in the Hosted Service
        if (protocol === 'near') {
          // Can be overwritten because the question will be skipped (product === undefined)
          product = 'hosted-service';
          return product;
        }

        if (value == 'subgraph-studio') {
          allowSimpleName = true;
        }

        product = value as any;
        return value;
      },
    },
    {
      type: 'input',
      name: 'subgraphName',
      message: () => (product == 'subgraph-studio' || studio ? 'Subgraph slug' : 'Subgraph name'),
      initial: subgraphName,
      validate: (name: string) => {
        try {
          validateSubgraphName(name, { allowSimpleName });
          return true;
        } catch (e) {
          return `${e.message}

  Examples:

    $ graph init ${os.userInfo().username}/${name}
    $ graph init ${name} --allow-simple-name`;
        }
      },
      result: (value: string) => {
        subgraphName = value;
        return value;
      },
    },
    {
      type: 'input',
      name: 'directory',
      message: 'Directory to create the subgraph in',
      initial: () =>
        directory ||
        getSubgraphBasename(
          // @ts-expect-error will be set by previous question
          subgraphName,
        ),
      validate: (value: string) =>
        filesystem.exists(
          value ||
            directory ||
            getSubgraphBasename(
              // @ts-expect-error will be set by previous question
              subgraphName,
            ),
        )
          ? 'Directory already exists'
          : true,
    },
    {
      type: 'select',
      name: 'network',
      message: () => `${protocolInstance.displayName()} network`,
      choices: () => {
        initDebug(
          'Generating list of available networks for protocol "%s" (%M)',
          protocol,
          availableNetworks.get(protocol as any),
        );
        return (
          // @ts-expect-error TODO: wait what?
          availableNetworks
            .get(protocol as ProtocolName) // Get networks related to the chosen protocol.
            .toArray()
        ); // Needed because of gluegun. It can't even receive a JS iterable.
      },

      skip: fromExample !== undefined,
      initial: network || 'mainnet',
      result: (value: string) => {
        network = value;
        return value;
      },
    },
    // TODO:
    //
    // protocols that don't support contract
    // - arweave
    // - cosmos
    {
      type: 'input',
      name: 'contract',
      message: () => {
        ProtocolContract = protocolInstance.getContract()!;
        return `Contract ${ProtocolContract.identifierName()}`;
      },
      skip: () => fromExample !== undefined || !protocolInstance.hasContract(),
      initial: contract,
      validate: async (value: string) => {
        if (fromExample !== undefined || !protocolInstance.hasContract()) {
          return true;
        }

        // Validate whether the contract is valid
        const { valid, error } = validateContract(value, ProtocolContract);

        return valid ? true : error;
      },
      result: async (value: string) => {
        if (fromExample !== undefined) {
          return value;
        }

        ABI = protocolInstance.getABI();

        // Try loading the ABI from Etherscan, if none was provided
        if (protocolInstance.hasABIs() && !abi) {
          try {
            if (network === 'poa-core') {
              // TODO: this variable is never used anywhere, what happens?
              // abiFromBlockScout = await loadAbiFromBlockScout(ABI, network, value)
            } else {
              abiFromEtherscan = await loadAbiFromEtherscan(ABI, network!, value);
            }
          } catch (e) {
            // noop
          }
        }
        // If startBlock is not set, try to load it.
        if (!startBlock) {
          try {
            // Load startBlock for this contract
            startBlock = Number(await loadStartBlockForContract(network!, value)).toString();
          } catch (error) {
            // noop
          }
        }
        return value;
      },
    },
    {
      type: 'input',
      name: 'abi',
      message: 'ABI file (path)',
      initial: abi,
      skip: () =>
        !protocolInstance.hasABIs() || fromExample !== undefined || abiFromEtherscan !== undefined,
      validate: async (value: string) => {
        if (fromExample || abiFromEtherscan || !protocolInstance.hasABIs()) {
          return true;
        }

        try {
          abiFromFile = loadAbiFromFile(ABI, value);
          return true;
        } catch (e) {
          return e.message;
        }
      },
    },
    {
      type: 'input',
      name: 'startBlock',
      message: 'Start Block',
      initial: () => startBlock || '0',
      skip: () => fromExample !== undefined,
      validate: (value: string) => parseInt(value) >= 0,
      result: (value: string) => {
        startBlock = value;
        return value;
      },
    },
    {
      type: 'input',
      name: 'contractName',
      message: 'Contract Name',
      initial: contractName || 'Contract',
      skip: () => fromExample !== undefined || !protocolInstance.hasContract(),
      validate: (value: string) => value && value.length > 0,
      result: (value: string) => {
        contractName = value;
        return value;
      },
    },
    {
      type: 'confirm',
      name: 'indexEvents',
      message: 'Index contract events as entities',
      initial: true,
      skip: () => !!indexEvents,
      result: (value: boolean) => {
        indexEvents = value;
        return value;
      },
    },
  ];

  try {
    const answers = await prompt.ask(questions);
    return {
      ...answers,
      abi: abiFromEtherscan || abiFromFile,
      protocolInstance,
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
      await system.run('git init', { cwd: directory });
      await system.run('git add --all', { cwd: directory });
      await system.run('git commit -m "Initial commit"', {
        cwd: directory,
      });
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
    studio,
    product,
  }: {
    fromExample: string | boolean;
    allowSimpleName?: boolean;
    subgraphName: string;
    directory: string;
    studio: boolean;
    product?: string;
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
        await system.run(`git clone http://github.com/graphprotocol/example-subgraphs ${tmpDir}`);

        // If an example is not specified, use the default one
        if (fromExample === undefined || fromExample === true) {
          fromExample = DEFAULT_EXAMPLE_SUBGRAPH;
        }

        const exampleSubgraphPath = path.join(tmpDir, String(fromExample));

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

  try {
    // It doesn't matter if we changed the URL we clone the YAML,
    // we'll check it's network anyway. If it's a studio subgraph we're dealing with.
    const dataSourcesAndTemplates = await DataSourcesExtractor.fromFilePath(
      path.join(directory, 'subgraph.yaml'),
    );

    for (const { network } of dataSourcesAndTemplates) {
      validateStudioNetwork({ studio, product, network });
    }
  } catch (e) {
    this.error(e.message, { exit: 1 });
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
        Object.keys(pkgJson.scripts).forEach(name => {
          pkgJson.scripts[name] = pkgJson.scripts[name].replace('example', subgraphName);
        });
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
  const repo = await initRepository(directory);
  if (repo !== true) {
    this.exit(1);
    return;
  }

  // Install dependencies
  const installed = await installDependencies(directory, commands);
  if (installed !== true) {
    this.exit(1);
    return;
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
    studio,
    product,
    startBlock,
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
    studio: boolean;
    product?: string;
    startBlock?: string;
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

  // We can validate this before the scaffold because we receive
  // the network from the form or via command line argument.
  // We don't need to read the manifest in this case.
  try {
    validateStudioNetwork({ studio, product, network });
  } catch (e) {
    this.error(e, { exit: 1 });
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
  const repo = await initRepository(directory);
  if (repo !== true) {
    this.exit(1);
    return;
  }

  // Install dependencies
  const installed = await installDependencies(directory, commands);
  if (installed !== true) {
    this.exit(1);
    return;
  }

  // Run code-generation
  const codegen = await runCodegen(directory, commands.codegen);
  if (codegen !== true) {
    this.exit(1);
    return;
  }

  while (addContract) {
    addContract = await addAnotherContract.bind(this)({ protocolInstance, directory });
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
    let abiFromFile = false;
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

    const localAbi = await ux.prompt('\nProvide local ABI path? (y/n)', {
      required: true,
      type: 'single',
    });
    abiFromFile = localAbi.toLowerCase() === 'y';

    let abiPath = '';
    if (abiFromFile) {
      abiPath = await ux.prompt('\nABI file (path)', { required: true });
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

      if (abiFromFile) {
        if (abiPath.includes(directory)) {
          commandLine.push('--abi', path.normalize(abiPath.replace(directory, '')));
        } else {
          commandLine.push('--abi', abiPath);
        }
      }

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
