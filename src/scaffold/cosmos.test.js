const immutable = require('immutable')
const Scaffold = require('./')
const Protocol = require('../protocols')

const protocol = new Protocol('cosmos')

const scaffoldOptions = {
  protocol,
  network: 'cosmoshub-4',
  contractName: 'CosmosHub'
}

const scaffold = new Scaffold(scaffoldOptions)

describe('Cosmos subgraph scaffolding', () => {
  test('Manifest', () => {
    expect(
      scaffold.generateManifest(),
    ).toEqual(`\
specVersion: 0.0.1
schema:
  file: ./schema.graphql
dataSources:
  - kind: cosmos
    name: CosmosHub
    network: cosmoshub-4
    source:
      startBlock: 0
    mapping:
      apiVersion: 0.0.5
      language: wasm/assemblyscript
      entities:
        - ExampleEntity
      blockHandlers:
        - handler: handleBlock
      file: ./src/contract.ts
`)
  })

  test('Schema (default)', () => {
    expect(scaffold.generateSchema()).toEqual(`\
type ExampleEntity @entity {
  id: ID!
  block: Bytes!
  count: BigInt!
}
`)
  })

  test('Mapping (default)', () => {
    expect(scaffold.generateMapping()).toEqual(`\
import { cosmos, BigInt } from "@graphprotocol/graph-ts"
import { ExampleEntity } from "../generated/schema"

export function handleBlock(block: cosmos.Block): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = ExampleEntity.load(block.header.hash.toHex())

  // Entities only exist after they have been saved to the store;
  // \`null\` checks allow to create entities on demand
  if (!entity) {
    entity = new ExampleEntity(block.header.hash.toHex())

    // Entity fields can be set using simple assignments
    entity.count = BigInt.fromI32(0)
  }

  // BigInt and BigDecimal math are supported
  entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on receipt information
  entity.height = block.header.height

  // Entities can be written to the store with \`.save()\`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // \`new Entity(...)\`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.
}
`)
  })
})
