const prettier = require('prettier')
const {
  abiEvents,
  generateEventType,
  generateExampleEntityType,
} = require('./schema')

module.exports = class Scaffold {
  constructor(options = {}) {
    this.protocol = options.protocol
    this.abi = options.abi
    this.indexEvents = options.indexEvents
    this.contract = options.contract
    this.network = options.network
    this.contractName = options.contractName
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
            event => generateEventType({ ...events, protocolName: this.protocol.name })
          )
            .join('\n\n')
        : generateExampleEntityType(this.protocol, events),
      {
        parser: 'graphql',
      },
    )
  }
}
