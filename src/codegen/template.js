const immutable = require('immutable')

const tsCodegen = require('./typescript')

module.exports = class DataSourceTemplateCodeGenerator {
  constructor(template) {
    this.template = template
  }

  generateModuleImports() {
    return [
      tsCodegen.moduleImports(
        ['Address', 'DataSourceTemplate'],
        '@graphprotocol/graph-ts',
      ),
    ]
  }

  generateTypes() {
    return immutable.List([this._generateTemplateType()])
  }

  _generateTemplateType() {
    let name = this.template.get('name')

    let klass = tsCodegen.klass(name, { export: true, extends: 'DataSourceTemplate' })
    klass.addMethod(this._generateCreateMethod())
    return klass
  }

  _generateCreateMethod() {
    let name = this.template.get('name')
    let kind = this.template.get('kind')

    switch (kind) {
      case 'ethereum/contract':
        return tsCodegen.staticMethod(
          'create',
          [tsCodegen.param('address', tsCodegen.namedType('Address'))],
          tsCodegen.namedType('void'),
          `
          DataSourceTemplate.create('${name}', [address.toHex()])
          `,
        )

      default:
        throw new Error(
          `Data sources with kind != 'ethereum/contract' are not supported yet`,
        )
    }
  }
}
