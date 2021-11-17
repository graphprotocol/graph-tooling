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
