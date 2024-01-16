import { describe, expect, test } from 'vitest';
import Protocol from '../protocols';
import Scaffold from './index';

const protocol = new Protocol('near');

const scaffoldOptions = {
  protocol,
  contract: 'abc.def.near',
  network: 'near-mainnet',
  contractName: 'Contract',
};

const scaffold = new Scaffold(scaffoldOptions);

describe.concurrent('NEAR subgraph scaffolding', () => {
  test('Manifest', async () => {
    expect(await scaffold.generateManifest()).toEqual(`\
specVersion: 1.0.0
indexerHints:
  prune: auto
schema:
  file: ./schema.graphql
dataSources:
  - kind: near
    name: Contract
    network: near-mainnet
    source:
      account: "abc.def.near"
    mapping:
      apiVersion: 0.0.5
      language: wasm/assemblyscript
      entities:
        - ExampleEntity
      receiptHandlers:
        - handler: handleReceipt
      file: ./src/contract.ts
`);
  });

  test('Schema (default)', async () => {
    expect(await scaffold.generateSchema()).toEqual(`\
type ExampleEntity @entity {
  id: ID!
  block: Bytes!
  count: BigInt!
}
`);
  });

  test('Mapping (default)', async () => {
    expect(await scaffold.generateMapping()).toEqual(`\
import { near, BigInt } from "@graphprotocol/graph-ts"
import { ExampleEntity } from "../generated/schema"

export function handleReceipt(
  receiptWithOutcome: near.ReceiptWithOutcome
): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = ExampleEntity.load(receiptWithOutcome.receipt.id.toHex())

  // Entities only exist after they have been saved to the store;
  // \`null\` checks allow to create entities on demand
  if (!entity) {
    entity = new ExampleEntity(receiptWithOutcome.receipt.id.toHex())

    // Entity fields can be set using simple assignments
    entity.count = BigInt.fromI32(0)
  }

  // BigInt and BigDecimal math are supported
  entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on receipt information
  entity.block = receiptWithOutcome.block.header.hash

  // Entities can be written to the store with \`.save()\`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // \`new Entity(...)\`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.
}
`);
  });
});
