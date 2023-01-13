import immutable from 'immutable';
import * as tsCodegen from '../../../codegen/typescript';

export default class EthereumTemplateCodeGen {
  constructor(public template: immutable.Map<any, any>) {
    this.template = template;
  }

  generateModuleImports() {
    return ['Address'];
  }

  generateCreateMethod() {
    const name = this.template.get('name');

    return tsCodegen.staticMethod(
      'create',
      [tsCodegen.param('address', tsCodegen.namedType('Address'))],
      tsCodegen.namedType('void'),
      `
      DataSourceTemplate.create('${name}', [address.toHex()])
      `,
    );
  }

  generateCreateWithContextMethod() {
    const name = this.template.get('name');

    return tsCodegen.staticMethod(
      'createWithContext',
      [
        tsCodegen.param('address', tsCodegen.namedType('Address')),
        tsCodegen.param('context', tsCodegen.namedType('DataSourceContext')),
      ],
      tsCodegen.namedType('void'),
      `
      DataSourceTemplate.createWithContext('${name}', [address.toHex()], context)
      `,
    );
  }
}
