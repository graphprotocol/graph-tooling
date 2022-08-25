const tsCodegen = require('../../../codegen/typescript')

module.exports = class IpfsFileTemplateCodeGen {
  constructor(template) {
    this.template = template
  }

  generateModuleImports() {
    return []
  }

  generateCreateMethod() {
    const name = this.template.get('name')

    return tsCodegen.staticMethod(
      'create',
      [tsCodegen.param('cid', tsCodegen.namedType('string'))],
      tsCodegen.namedType('void'),
      `
      DataSourceTemplate.create('${name}', [cid])
      `,
    )
  }

  generateCreateWithContextMethod() {
    const name = this.template.get('name')

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
    )
  }
}
