import debugFactory from 'debug';
import fs from 'fs-extra';
import { strings } from 'gluegun';
import prettier from 'prettier';
import { getSubgraphBasename } from '../command-helpers/subgraph.js';
import ABI from '../protocols/ethereum/abi.js';
import Protocol from '../protocols/index.js';
import { version } from '../version.js';
import { getDockerFile } from './get-docker-file.js';
import { getGitIgnore } from './get-git-ignore.js';
import { generateEventIndexingHandlers } from './mapping.js';
import { abiEvents, generateEventType, generateExampleEntityType } from './schema.js';
import { generateTestsFiles } from './tests.js';

const scaffoldDebugger = debugFactory('graph-cli:scaffold');

const GRAPH_CLI_VERSION = process.env.GRAPH_CLI_TESTS
  ? // JSON.stringify should remove this key, we will install the local
    // graph-cli for the tests using `npm link` instead of fetching from npm.
    undefined
  : // For scaffolding real subgraphs
    version;
const GRAPH_TS_VERSION = '0.37.0';
const GRAPH_MATCHSTICK_VERSION = '0.6.0';

export interface ScaffoldOptions {
  protocol: Protocol;
  abi?: ABI;
  indexEvents?: boolean;
  contract?: string;
  network: string;
  contractName: string;
  startBlock?: string;
  subgraphName?: string;
  node?: string;
  spkgPath?: string;
  entities?: string[];
}

export default class Scaffold {
  protocol: Protocol;
  abi?: ABI;
  indexEvents?: boolean;
  contract?: string;
  network: string;
  contractName: string;
  subgraphName?: string;
  node?: string;
  startBlock?: string;
  spkgPath?: string;
  entities?: string[];

  constructor({
    protocol,
    abi,
    contract,
    network,
    contractName,
    startBlock,
    subgraphName,
    node,
    spkgPath,
    indexEvents,
    entities,
  }: ScaffoldOptions) {
    this.protocol = protocol;
    this.abi = abi;
    this.contract = contract;
    this.network = network;
    this.contractName = contractName;
    this.startBlock = startBlock;
    this.subgraphName = subgraphName;
    this.node = node;
    this.spkgPath = spkgPath;
    this.indexEvents = indexEvents;
    this.entities = entities;

    scaffoldDebugger('Scaffold constructor called with ABI:', abi);
    scaffoldDebugger('ABI data:', abi?.data);
    scaffoldDebugger('ABI file:', abi?.file);
  }

  async generatePackageJson() {
    return await prettier.format(
      JSON.stringify({
        name: getSubgraphBasename(String(this.subgraphName)),
        license: 'UNLICENSED',
        scripts: {
          codegen: 'graph codegen',
          build: 'graph build',
          deploy: `graph deploy ` + `--node ${this.node} ` + this.subgraphName,
          'create-local': `graph create --node http://localhost:8020/ ${this.subgraphName}`,
          'remove-local': `graph remove --node http://localhost:8020/ ${this.subgraphName}`,
          'deploy-local':
            `graph deploy ` +
            `--node http://localhost:8020/ ` +
            `--ipfs http://localhost:5001 ` +
            this.subgraphName,
          test: 'graph test',
        },
        dependencies: {
          '@graphprotocol/graph-cli': GRAPH_CLI_VERSION,
          '@graphprotocol/graph-ts': GRAPH_TS_VERSION,
        },
        devDependencies: this.protocol.hasEvents()
          ? { 'matchstick-as': GRAPH_MATCHSTICK_VERSION }
          : undefined,
      }),
      { parser: 'json' },
    );
  }

  async generatePackageJsonForSubstreams() {
    return await prettier.format(
      JSON.stringify({
        name: getSubgraphBasename(String(this.subgraphName)),
        license: 'UNLICENSED',
        scripts: {
          build: 'graph build',
          deploy: `graph deploy ` + `--node ${this.node} ` + this.subgraphName,
          'create-local': `graph create --node http://localhost:8020/ ${this.subgraphName}`,
          'remove-local': `graph remove --node http://localhost:8020/ ${this.subgraphName}`,
          'deploy-local':
            `graph deploy ` +
            `--node http://localhost:8020/ ` +
            `--ipfs http://localhost:5001 ` +
            this.subgraphName,
          test: 'graph test',
        },
        dependencies: {
          '@graphprotocol/graph-cli': GRAPH_CLI_VERSION,
        },
      }),
      { parser: 'json' },
    );
  }

  async generateManifest() {
    const protocolManifest = this.protocol.getManifestScaffold();
    const name = this.contractName || getSubgraphBasename(String(this.subgraphName));

    return await prettier.format(
      `
specVersion: 1.2.0
indexerHints:
  prune: auto
schema:
  file: ./schema.graphql
dataSources:
  - kind: ${this.protocol.name}
    name: ${name}
    network: ${this.network}
    source: ${protocolManifest.source({ ...this, spkgPath: './substreams.spkg', spkgModule: 'graph_out' })}
    mapping: ${protocolManifest.mapping(this)}
`,
      { parser: 'yaml' },
    );
  }

  async generateSchema() {
    const hasEvents = this.protocol.hasEvents();
    const events = hasEvents ? abiEvents(this.abi!).toJS() : [];

    return await prettier.format(
      hasEvents && this.indexEvents
        ? events
            .map((event: any) => generateEventType(event, this.protocol.name, this.contractName))
            .join('\n\n')
        : generateExampleEntityType(this.protocol, events),
      {
        parser: 'graphql',
        trailingComma: 'none',
      },
    );
  }

  async generateSpkgContent() {
    if (!this.spkgPath) {
      return undefined;
    }
    return fs.readFile(this.spkgPath);
  }

  async generateTsConfig() {
    return await prettier.format(
      JSON.stringify({
        extends: '@graphprotocol/graph-ts/types/tsconfig.base.json',
        include: ['src', 'tests'],
      }),
      { parser: 'json' },
    );
  }

  async generateDockerFileConfig() {
    return await prettier.format(getDockerFile(), { parser: 'yaml' });
  }

  generateGitIgnoreFile() {
    return getGitIgnore();
  }

  async generateMappings() {
    return this.protocol.getMappingScaffold()
      ? { [`${strings.kebabCase(this.contractName)}.ts`]: await this.generateMapping() }
      : undefined;
  }

  async generateMapping() {
    const hasEvents = this.protocol.hasEvents();
    const events = hasEvents ? abiEvents(this.abi!).toJS() : [];
    const protocolMapping = this.protocol.getMappingScaffold();

    return await prettier.format(
      hasEvents && this.indexEvents
        ? generateEventIndexingHandlers(events, this.contractName)
        : protocolMapping.generatePlaceholderHandlers({
            ...this,
            events,
          }),
      { parser: 'typescript', semi: false, trailingComma: 'none' },
    );
  }

  async generateABIs() {
    scaffoldDebugger('Generating ABIs...');
    scaffoldDebugger('Protocol has ABIs:', this.protocol.hasABIs());
    scaffoldDebugger('ABI data:', this.abi?.data);
    scaffoldDebugger('ABI file:', this.abi?.file);

    if (!this.protocol.hasABIs()) {
      scaffoldDebugger('Protocol does not have ABIs, skipping ABI generation');
      return;
    }

    if (!this.abi?.data) {
      scaffoldDebugger('ABI data is undefined, skipping ABI generation');
      return;
    }

    return this.protocol.hasABIs()
      ? {
          [`${this.contractName}.json`]: await prettier.format(JSON.stringify(this.abi.data), {
            parser: 'json',
          }),
        }
      : undefined;
  }

  async generateTests() {
    const hasEvents = this.protocol.hasEvents();
    const events = hasEvents ? abiEvents(this.abi!).toJS() : [];

    return events.length > 0
      ? await generateTestsFiles(this.contractName, events, this.indexEvents)
      : undefined;
  }

  async generate() {
    if (this.protocol.name === 'substreams') {
      return {
        'subgraph.yaml': await this.generateManifest(),
        'schema.graphql': await this.generateSchema(),
        'package.json': await this.generatePackageJsonForSubstreams(),
        '.gitignore': await this.generateGitIgnoreFile(),
        'substreams.spkg': await this.generateSpkgContent(),
      };
    }
    return {
      'package.json': await this.generatePackageJson(),
      'subgraph.yaml': await this.generateManifest(),
      'schema.graphql': await this.generateSchema(),
      'tsconfig.json': await this.generateTsConfig(),
      'docker-compose.yml': await this.generateDockerFileConfig(),
      '.gitignore': await this.generateGitIgnoreFile(),
      src: await this.generateMappings(),
      abis: await this.generateABIs(),
      tests: await this.generateTests(),
    };
  }
}
