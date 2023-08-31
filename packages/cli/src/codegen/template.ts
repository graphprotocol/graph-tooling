import immutable from 'immutable';
import Protocol from '../protocols';
import FileTemplateCodeGen from '../protocols/file_template';
import * as tsCodegen from './typescript';

export default class DataSourceTemplateCodeGenerator {
  protocolTemplateCodeGen: any;

  constructor(
    public template: immutable.Map<any, any>,
    protocol: Protocol,
  ) {
    this.template = template;
    const kind = template.get('kind');

    if (kind.split('/')[0] == protocol.name) {
      this.protocolTemplateCodeGen = protocol.getTemplateCodeGen(template);
    } else if (kind == 'file/ipfs' || kind == 'file/arweave') {
      this.protocolTemplateCodeGen = new FileTemplateCodeGen(template);
    } else {
      throw new Error(`DataSourceTemplate kind not supported: ${kind}`);
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

    const klass = tsCodegen.klass(name, {
      export: true,
      extends: 'DataSourceTemplate',
    });
    klass.addMethod(this.protocolTemplateCodeGen.generateCreateMethod());
    klass.addMethod(this.protocolTemplateCodeGen.generateCreateWithContextMethod());
    return klass;
  }
}
