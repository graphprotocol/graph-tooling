module.exports = class SubstreamsSubgraph {
  constructor(options = {}) {
    this.manifest = options.manifest
    this.resolveFile = options.resolveFile
    this.protocol = options.protocol
  }

  validateManifest() {
    return []
  }

  handlerTypes() {
    return []
  }
}
