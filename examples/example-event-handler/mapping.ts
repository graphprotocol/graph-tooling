/// <reference path="./node_modules/assemblyscript/std/assembly.d.ts" />
/// <reference path="./node_modules/the-graph-wasm/index.d.ts" />
/// <reference path="./types/ExampleContract.types.ts" />

export function handleExampleEvent(event: ExampleEvent): void {
  let entity = new Entity() 
  entity.setString('exampleAttribute', event.params.exampleParam)

  store.set('ExampleEntity', 'example id', entity)
}
