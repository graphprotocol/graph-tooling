import fs from 'fs-extra';
import * as graphql from 'graphql/language/index.js';
import type { DocumentNode } from 'graphql/language/index.js';
import SchemaCodeGenerator from './codegen/schema.js';

export default class Schema {
  constructor(
    public document: string,
    public ast: DocumentNode,
    public filename?: string,
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
    return new Schema(document, ast, filename);
  }

  static async loadFromString(document: string) {
    try {
      const ast = graphql.parse(document);
      return new Schema(document, ast);
    } catch (e) {
      throw new Error(`Failed to load schema from string: ${e.message}`);
    }
  }

  getEntityNames(): string[] {
    return this.ast.definitions
      .filter(
        def =>
          def.kind === 'ObjectTypeDefinition' &&
          def.directives?.find(directive => directive.name.value === 'entity') !== undefined,
      )
      .map(entity => (entity as graphql.ObjectTypeDefinitionNode).name.value);
  }
}
