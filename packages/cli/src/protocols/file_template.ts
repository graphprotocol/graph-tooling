/* eslint-disable */

import immutable from 'immutable';
import * as tsCodegen from '../codegen/typescript';

export default class FileTemplateCodeGen {
  constructor(private template: immutable.Map<any, any>) {
    this.template = template;
  }

  generateModuleImports() {
    return [];
  }

  generateCreateMethod() {
    const name = this.template.get('name');

    return tsCodegen.staticMethod(
      'create',
      [tsCodegen.param('cid', tsCodegen.namedType('string'))],
      tsCodegen.namedType('void'),
      `
      DataSourceTemplate.create('${name}', [cid])
      `,
    );
  }

  generateCreateWithContextMethod() {
    const name = this.template.get('name');

    return tsCodegen.staticMethod(
      'createWithContext',
      [
        tsCodegen.param('cid', tsCodegen.namedType('string')),
        tsCodegen.param('context', tsCodegen.namedType('DataSourceContext')),
      ],
      tsCodegen.namedType('void'),
      `
      DataSourceTemplate.createWithContext('${name}', [cid], context)
      `,
    );
  }
}
