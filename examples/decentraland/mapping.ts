/// <reference path="./node_modules/assemblyscript/std/assembly.d.ts" />
/// <reference path="./node_modules/the-graph-wasm/index.d.ts" />
/// <reference path="./types/Marketplace.types.ts" />

export function handleAuctionCreated(event: EthereumEvent): void {
  let entity = new Entity()
  entity.setString(
    'assetId',
    event.params.filter(p => p.name == 'assetId')[0].value.toString(),
  )
  database.create('ExampleEntity', 'example id', entity)
}
