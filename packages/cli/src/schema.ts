import fs from 'fs-extra';
import * as graphql from 'graphql/language';
import type { DocumentNode } from 'graphql/language';
import SchemaCodeGenerator from './codegen/schema';

export default class Schema {
  constructor(
    public filename: string,
    public document: string,
    public ast: DocumentNode,
  ) {
    this.filename = filename;
    this.document = document;
    this.ast = ast;
  }

  codeGenerator() {
    return new SchemaCodeGenerator(this);
  }

  static async load(filename: string) {
    const document = await fs.readFile(filename, 'utf-8');
    const ast = graphql.parse(document);
    return new Schema(filename, document, ast);
  }
}
