const immutable = require('immutable')

module.exports = class TendermintSubgraph {
  constructor(options = {}) {
    this.manifest = options.manifest
    this.resolveFile = options.resolveFile
    this.protocol = options.protocol
  }

  validateManifest() {
    return immutable.List()
  }

  handlerTypes() {
    return immutable.List([
      'blockHandlers',
      'eventHandlers',
    ])
  }
}
