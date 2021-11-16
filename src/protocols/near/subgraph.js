const immutable = require('immutable')
const { validateContractValues } = require('../../validation')

module.exports = class NearSubgraph {
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
      'receiptHandlers',
    ])
  }
}
