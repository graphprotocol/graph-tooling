const EthereumTypeGenerator = require('./ethereum/type-generator')
const EthereumTemplateCodeGen = require('./ethereum/codegen/template')
const NearTemplateCodeGen = require('./near/codegen/template')
const EthereumABI = require('./ethereum/abi')

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

  getTemplateCodeGen(template) {
    switch (this.name) {
      case 'ethereum':
      case 'ethereum/contract':
        return new EthereumTemplateCodeGen(template)
      case 'near':
        return new NearTemplateCodeGen(template)
      default:
        throw new Error(
          `Data sources with kind '${this.name}' are not supported yet`,
        )
    }
  }

  getABI() {
    switch (this.name) {
      case 'ethereum':
      case 'ethereum/contract':
        return EthereumABI
      case 'near':
        return null
    }
  }
}
