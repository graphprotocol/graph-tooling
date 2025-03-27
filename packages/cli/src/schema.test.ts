import { describe, expect, test } from 'vitest';
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

  test('getEntityNames returns all entity types', async () => {
    const schema = await Schema.loadFromString(schemaDocument);
    const entityNames = schema.getEntityNames();
    expect(entityNames).toEqual(['Entity1', 'Entity2', 'Entity3']);
  });

  test('getImmutableEntityNames returns only immutable entity types', async () => {
    const schema = await Schema.loadFromString(schemaDocument);
    const immutableEntityNames = schema.getImmutableEntityNames();
    expect(immutableEntityNames).toEqual(['Entity2']);
  });

  test('getImmutableEntityNames handles entities without immutable flag', async () => {
    const schema = await Schema.loadFromString(schemaDocument);
    const immutableEntityNames = schema.getImmutableEntityNames();
    expect(immutableEntityNames).not.toContain('Entity1');
  });

  test('getImmutableEntityNames handles explicitly non-immutable entities', async () => {
    const schema = await Schema.loadFromString(schemaDocument);
    const immutableEntityNames = schema.getImmutableEntityNames();
    expect(immutableEntityNames).not.toContain('Entity3');
  });

  test('getImmutableEntityNames ignores non-entity types', async () => {
    const schema = await Schema.loadFromString(schemaDocument);
    const immutableEntityNames = schema.getImmutableEntityNames();
    expect(immutableEntityNames).not.toContain('Entity1');
    expect(immutableEntityNames).not.toContain('Entity3');
  });
});
