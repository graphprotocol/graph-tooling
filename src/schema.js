let fs = require('fs-extra')
let graphql = require('graphql/language')
let immutable = require('immutable')

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

  static load(filename) {
    let document = fs.readFileSync(filename, 'utf-8')
    let ast = graphql.parse(document)
    return new Schema(filename, document, immutable.fromJS(ast))
  }
}
