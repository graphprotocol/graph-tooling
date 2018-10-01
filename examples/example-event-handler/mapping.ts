import 'allocator/arena'
export { allocate_memory }

import { store, crypto, Entity } from '@graphprotocol/graph-ts'
import { ExampleEvent } from './types/ExampleSubgraph/ExampleContract'

export function handleExampleEvent(event: ExampleEvent): void {
  let entity = new Entity()
  entity.setString('exampleAttribute', event.params.exampleParam)

  store.set('ExampleEntity', 'example id', entity)
  store.get('ExampleEntity', 'example id')
}
