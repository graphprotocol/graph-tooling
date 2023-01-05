import fs from 'fs-extra'
import * as graphql from 'graphql/language'
import immutable from 'immutable'
import SchemaCodeGenerator from './codegen/schema'

export default class Schema {
  constructor(
    public filename: string,
    public document: string,
    public ast: immutable.Collection<unknown, unknown>,
  ) {
    this.filename = filename
    this.document = document
    this.ast = ast
  }

  codeGenerator() {
    return new SchemaCodeGenerator(this)
  }

  static async load(filename: string) {
    let document = await fs.readFile(filename, 'utf-8')
    let ast = graphql.parse(document)
    return new Schema(filename, document, immutable.fromJS(ast))
  }
}
