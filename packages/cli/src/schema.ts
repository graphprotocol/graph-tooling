import fs from 'fs-extra';
import * as graphql from 'graphql/language';
import type { DocumentNode } from 'graphql/language';
import SchemaCodeGenerator from './codegen/schema';
import debug from './debug';

const schemaDebug = debug('graph-cli:type-generator');

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

  static async loadFromString(filename: string, document: string) {
    try {
      const ast = graphql.parse(document);
      schemaDebug('Loaded schema from string');
      return new Schema(filename, document, ast);
    } catch (e) {
      schemaDebug('Failed to load schema from string: %s', e.message);
      throw new Error(`Failed to load schema from string: ${e.message}`);
    }
  }
}
