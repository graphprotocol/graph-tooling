const tsCodegen = require('../../../codegen/typescript')

module.exports = class NearTemplateCodeGen {
  constructor(template) {
    this.template = template
  }

  generateModuleImports() {
    return [
      'near',
    ]
  }

  generateCreateMethod() {
    const name = this.template.get('name')

    return tsCodegen.staticMethod(
      'create',
      [tsCodegen.param('accountId', tsCodegen.namedType('near.AccountId'))],
      tsCodegen.namedType('void'),
      `
      DataSourceTemplate.create('${name}', [accountId])
      `,
    )
  }

  generateCreateWithContextMethod() {
    const name = this.template.get('name')

    return tsCodegen.staticMethod(
      'createWithContext',
      [
        tsCodegen.param('accountId', tsCodegen.namedType('near.AccountId')),
        tsCodegen.param('context', tsCodegen.namedType('DataSourceContext')),
      ],
      tsCodegen.namedType('void'),
      `
      DataSourceTemplate.createWithContext('${name}', [accountId], context)
      `,
    )
  }
}
