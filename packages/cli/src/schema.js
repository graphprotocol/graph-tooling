let fs = require('fs-extra')
let graphql = require('graphql/language')

let SchemaCodeGenerator = require('./codegen/schema')

module.exports = class Schema {
  constructor(filename, document, ast) {
    this.filename = filename
    this.document = document
    this.ast = ast
  }

  codeGenerator() {
    return new SchemaCodeGenerator(this)
  }

  static async load(filename) {
    let document = await fs.readFile(filename, 'utf-8')
    let ast = graphql.parse(document)
    return new Schema(filename, document, ast)
  }
}
