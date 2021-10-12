const EthereumTypeGenerator = require('./ethereum/type-generator')

module.exports = class Protocol {
  static fromDataSources(dataSourcesAndTemplates) {
    const firstDataSourceKind = dataSourcesAndTemplates[0].kind
    return new Protocol(firstDataSourceKind)
  }

  constructor(name) {
    this.name = name
  }

  hasABIs() {
    switch (this.name) {
      case 'ethereum':
      case 'ethereum/contract':
        return true
      case 'near':
        return false
    }
  }

  getTypeGenerator(options) {
    switch (this.name) {
      case 'ethereum':
      case 'ethereum/contract':
        return new EthereumTypeGenerator(options)
      case 'near':
        return null
    }
  }
}
