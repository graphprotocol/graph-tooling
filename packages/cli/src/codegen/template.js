import immutable from 'immutable'
import IpfsFileTemplateCodeGen from '../protocols/ipfs/codegen/file_template'

import * as tsCodegen from './typescript'

export default class DataSourceTemplateCodeGenerator {
  constructor(template, protocol) {
    this.template = template
    let kind = template.get('kind')

    if (kind.split('/')[0] == protocol.name) {
      this.protocolTemplateCodeGen = protocol.getTemplateCodeGen(template)
    } else if (kind == 'file/ipfs') {
      this.protocolTemplateCodeGen = new IpfsFileTemplateCodeGen(template)
    }
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
