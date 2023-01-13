import immutable from 'immutable';
import Protocol from '../protocols';
import IpfsFileTemplateCodeGen from '../protocols/ipfs/codegen/file_template';
import * as tsCodegen from './typescript';

export default class DataSourceTemplateCodeGenerator {
  protocolTemplateCodeGen: any;

  constructor(public template: immutable.Map<any, any>, protocol: Protocol) {
    this.template = template;
    const kind = template.get('kind');

    if (kind.split('/')[0] == protocol.name) {
      this.protocolTemplateCodeGen = protocol.getTemplateCodeGen(template);
    } else if (kind == 'file/ipfs') {
      this.protocolTemplateCodeGen = new IpfsFileTemplateCodeGen(template);
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
    ];
  }

  generateTypes() {
    return immutable.List([this._generateTemplateType()]);
  }

  _generateTemplateType() {
    const name = this.template.get('name');

    const klass = tsCodegen.klass(name, { export: true, extends: 'DataSourceTemplate' });
    klass.addMethod(this.protocolTemplateCodeGen.generateCreateMethod());
    klass.addMethod(this.protocolTemplateCodeGen.generateCreateWithContextMethod());
    return klass;
  }
}
