const prettier = require('prettier')
const pkginfo = require('pkginfo')(module)
const { strings } = require('gluegun')

const GRAPH_CLI_VERSION = process.env.GRAPH_CLI_TESTS
  // JSON.stringify should remove this key, we will install the local
  // graph-cli for the tests using `npm link` instead of fetching from npm.
  ? undefined
  // For scaffolding real subgraphs
  : `${module.exports.version}`

const {
  abiEvents,
  generateEventType,
  generateExampleEntityType,
} = require('./schema')
const { generateEventIndexingHandlers } = require('./mapping')
const { generateTestsFiles } = require('./tests')
const { getSubgraphBasename } = require('../command-helpers/subgraph')

module.exports = class Scaffold {
  constructor(options = {}) {
    this.protocol = options.protocol
    this.abi = options.abi
    this.indexEvents = options.indexEvents
    this.contract = options.contract
    this.network = options.network
    this.contractName = options.contractName
    this.subgraphName = options.subgraphName
    this.node = options.node
  }

  generatePackageJson() {
    return prettier.format(
      JSON.stringify({
        name: getSubgraphBasename(this.subgraphName),
        license: 'UNLICENSED',
        scripts: {
          codegen: 'graph codegen',
          build: 'graph build',
          deploy:
            `graph deploy ` +
            `--node ${this.node} ` +
            this.subgraphName,
          'create-local': `graph create --node http://localhost:8020/ ${this.subgraphName}`,
          'remove-local': `graph remove --node http://localhost:8020/ ${this.subgraphName}`,
          'deploy-local':
            `graph deploy ` +
            `--node http://localhost:8020/ ` +
            `--ipfs http://localhost:5001 ` +
            this.subgraphName,
          'test': 'graph test',
        },
        dependencies: {
          '@graphprotocol/graph-cli': GRAPH_CLI_VERSION,
          '@graphprotocol/graph-ts': `0.27.0`,
        },
        devDependencies: this.protocol.hasEvents() ? { 'matchstick-as': `0.5.0`} : undefined,
      }),
      { parser: 'json' },
    )
  }

  generateManifest() {
    const protocolManifest = this.protocol.getManifestScaffold()

    return prettier.format(`
specVersion: 0.0.1
schema:
  file: ./schema.graphql
dataSources:
  - kind: ${this.protocol.name}
    name: ${this.contractName}
    network: ${this.network}
    source: ${protocolManifest.source(this)}
    mapping: ${protocolManifest.mapping(this)}
`,
      { parser: 'yaml' },
    )
  }

  generateSchema() {
    const hasEvents = this.protocol.hasEvents()
    const events = hasEvents
      ? abiEvents(this.abi).toJS()
      : []

    return prettier.format(
      hasEvents && this.indexEvents
        ? events.map(
            event => generateEventType(event, this.protocol.name)
          )
            .join('\n\n')
        : generateExampleEntityType(this.protocol, events),
      {
        parser: 'graphql',
      },
    )
  }

  generateTsConfig() {
    return prettier.format(
      JSON.stringify({
        extends: '@graphprotocol/graph-ts/types/tsconfig.base.json',
        include: ['src'],
      }),
      { parser: 'json' },
    )
  }

  generateMapping() {
    const hasEvents = this.protocol.hasEvents()
    const events = hasEvents
      ? abiEvents(this.abi).toJS()
      : []

    const protocolMapping = this.protocol.getMappingScaffold()

    return prettier.format(
      hasEvents && this.indexEvents
        ? generateEventIndexingHandlers(
            events,
            this.contractName,
          )
        : protocolMapping.generatePlaceholderHandlers({
            ...this,
            events,
          }),
      { parser: 'typescript', semi: false },
    )
  }

  generateABIs() {
    return this.protocol.hasABIs()
      ? {
        [`${this.contractName}.json`]: prettier.format(JSON.stringify(this.abi.data), {
          parser: 'json',
        }),
      }
      : undefined
  }

  generateTests() {
    const hasEvents = this.protocol.hasEvents()
    const events = hasEvents
      ? abiEvents(this.abi).toJS()
      : []

    return events.length > 0
      ?  generateTestsFiles(this.contractName, events, this.indexEvents)
      : undefined
  }

  generate() {
    return {
      'package.json': this.generatePackageJson(),
      'subgraph.yaml': this.generateManifest(),
      'schema.graphql': this.generateSchema(),
      'tsconfig.json': this.generateTsConfig(),
      src: { [`${strings.kebabCase(this.contractName)}.ts`]: this.generateMapping() },
      abis: this.generateABIs(),
      tests: this.generateTests(),
    }
  }
}
