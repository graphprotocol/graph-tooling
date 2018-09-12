/// <reference path="./node_modules/assemblyscript/index.d.ts" />
/// <reference path="./node_modules/graph-cli/index.d.ts" />
/// <reference path="./types/ExampleSubgraph/ExampleContract.types.ts" />

export function handleExampleEvent(event: ExampleEvent): void {
  let entity = new Entity()
  entity.setString('exampleAttribute', event.params.exampleParam)

  store.set('ExampleEntity', 'example id', entity)
  store.get('ExampleEntity', 'example id')
}
