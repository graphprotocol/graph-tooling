import { beforeEach, describe, expect, test } from 'vitest';
import Schema from './schema.js';

describe('Schema', () => {
  const schemaDocument = `
    type Entity1 @entity {
      id: ID!
    }

    type Entity2 @entity(immutable: true) {
      id: ID!
    }

    type Entity3 @entity(immutable: false) {
      id: ID!
    }
  `;

  let schema: Schema;

  beforeEach(async () => {
    schema = await Schema.loadFromString(schemaDocument);
  });

  test('getEntityNames returns all entity types', () => {
    const entityNames = schema.getEntityNames();
    expect(entityNames).toEqual(['Entity1', 'Entity2', 'Entity3']);
  });

  test('getImmutableEntityNames returns only immutable entity types', () => {
    const immutableEntityNames = schema.getImmutableEntityNames();
    expect(immutableEntityNames).toEqual(['Entity2']);
  });

  test('getImmutableEntityNames handles entities without immutable flag', () => {
    const immutableEntityNames = schema.getImmutableEntityNames();
    expect(immutableEntityNames).not.toContain('Entity1');
  });

  test('getImmutableEntityNames handles explicitly non-immutable entities', () => {
    const immutableEntityNames = schema.getImmutableEntityNames();
    expect(immutableEntityNames).not.toContain('Entity3');
  });
});
