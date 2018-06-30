/// <reference path="./node_modules/assemblyscript/std/assembly.d.ts" />
/// <reference path="./node_modules/the-graph-wasm/index.d.ts" />
/// <reference path="./types/ExampleContract.types.ts" />

export function handleExampleEvent(event: EthereumEvent): void {
  let entity = new Entity()
  entity.setString('exampleAttribute', event.params[0].value.toString())
  database.create('ExampleEntity', 'example id', entity)
}
