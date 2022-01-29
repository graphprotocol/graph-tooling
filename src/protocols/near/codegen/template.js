const tsCodegen = require('../../../codegen/typescript')

module.exports = class NearTemplateCodeGen {
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
      [tsCodegen.param('account', tsCodegen.namedType('string'))],
      tsCodegen.namedType('void'),
      `
      DataSourceTemplate.create('${name}', [account])
      `,
    )
  }

  generateCreateWithContextMethod() {
    const name = this.template.get('name')

    return tsCodegen.staticMethod(
      'createWithContext',
      [
        tsCodegen.param('account', tsCodegen.namedType('string')),
        tsCodegen.param('context', tsCodegen.namedType('DataSourceContext')),
      ],
      tsCodegen.namedType('void'),
      `
      DataSourceTemplate.createWithContext('${name}', [account], context)
      `,
    )
  }
}
