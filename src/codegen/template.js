const immutable = require('immutable')

const tsCodegen = require('./typescript')

module.exports = class DataSourceTemplateCodeGenerator {
  constructor(template, protocol) {
    this.template = template
    this.protocolTemplateCodeGen = protocol.getTemplateCodeGen(template)
  }

  generateModuleImports() {
    return [
      tsCodegen.moduleImports(
        [
          ...this.protocolTemplateCodeGen.generateModuleImports(),
          'DataSourceTemplate',
          'DataSourceContext',
        ],
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
    klass.addMethod(this.protocolTemplateCodeGen.generateCreateMethod())
    klass.addMethod(this.protocolTemplateCodeGen.generateCreateWithContextMethod())
    return klass
  }
}
